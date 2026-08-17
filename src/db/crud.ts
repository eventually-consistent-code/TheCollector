/**
 * Purpose: Typed CRUD for collections and items. Pure data layer — takes the
 * database as an argument so UI code and tests share one implementation.
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';
import * as Crypto from 'expo-crypto';

import type { Vertical } from './schema';

// Variables

const now = () => new Date().toISOString();

// Collections

export interface CreateCollectionInput {
  name: string;
  vertical: Vertical;
  // Owner — required for sync routing + RLS; from session.user.id.
  userId: string;
}

// Creates a collection, returns its id.
export async function createCollection(
  db: AbstractPowerSyncDatabase,
  input: CreateCollectionInput
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = now();
  await db.execute(
    `INSERT INTO collections (id, user_id, name, vertical, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.name, input.vertical, ts, ts]
  );
  return id;
}

export async function renameCollection(
  db: AbstractPowerSyncDatabase,
  id: string,
  name: string
): Promise<void> {
  await db.execute(`UPDATE collections SET name = ?, updated_at = ? WHERE id = ?`, [
    name,
    now(),
    id,
  ]);
}

// Deletes a collection and everything in it — items go too, on purpose.
export async function deleteCollection(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM items WHERE collection_id = ?`, [id]);
    await tx.execute(`DELETE FROM collections WHERE id = ?`, [id]);
  });
}

// Items

export interface ItemFieldsInput {
  name: string;
  notes?: string;
  acquiredAt?: string; // ISO date
  purchasePriceCents?: number;
  currentValueCents?: number;
  customFields?: Record<string, unknown>;
  tags?: string[];
  // Metadata source-link (phase 7) — where a lookup fill came from and the
  // source's own id for the hit. Leave undefined on manual edits and the
  // existing values stay put; only a provided value overwrites.
  source?: string;
  sourceId?: string;
  // Where the value figure came from — history rows record it; absent
  // means the collector typed it themselves ('manual').
  valueSource?: string;
}

// Appends a value-history row — the item's value trail, one row per change.
// Runs inside the caller's transaction so item + history land together.
async function appendValueHistory(
  tx: Pick<AbstractPowerSyncDatabase, 'execute'>,
  userId: string,
  itemId: string,
  valueCents: number,
  source: string | undefined
): Promise<void> {
  await tx.execute(
    `INSERT INTO item_value_history (id, user_id, item_id, value_cents, recorded_at, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [Crypto.randomUUID(), userId, itemId, valueCents, now(), source ?? 'manual']
  );
}

// Serializes tags for storage — normalized, empty set stores null.
const tagsToJson = (tags?: string[]): string | null => {
  const normalized = normalizeTags(tags ?? []);
  return normalized.length ? JSON.stringify(normalized) : null;
};

// Creates an item in a collection, returns its id.
export async function createItem(
  db: AbstractPowerSyncDatabase,
  collectionId: string,
  input: ItemFieldsInput,
  userId: string
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = now();
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO items
         (id, user_id, collection_id, name, notes, acquired_at,
          purchase_price_cents, current_value_cents, custom_fields, tags,
          source, source_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        collectionId,
        input.name,
        input.notes ?? null,
        input.acquiredAt ?? null,
        input.purchasePriceCents ?? null,
        input.currentValueCents ?? null,
        input.customFields ? JSON.stringify(input.customFields) : null,
        tagsToJson(input.tags),
        input.source ?? null,
        input.sourceId ?? null,
        ts,
        ts,
      ]
    );

    // A value at birth is the first point on the trail.
    if (input.currentValueCents != null) {
      await appendValueHistory(tx, userId, id, input.currentValueCents, input.valueSource);
    }
  });
  return id;
}

export async function updateItem(
  db: AbstractPowerSyncDatabase,
  id: string,
  input: ItemFieldsInput
): Promise<void> {
  // One read before the write — value-change detection for the history
  // trail, and the source columns survive updates that omit them.
  const existing = await db.getOptional<{
    user_id: string;
    current_value_cents: number | null;
    source: string | null;
    source_id: string | null;
  }>(`SELECT user_id, current_value_cents, source, source_id FROM items WHERE id = ?`, [id]);
  if (!existing) {
    return;
  }

  const valueChanged =
    input.currentValueCents != null &&
    input.currentValueCents !== existing.current_value_cents;

  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE items SET
         name = ?, notes = ?, acquired_at = ?,
         purchase_price_cents = ?, current_value_cents = ?, custom_fields = ?,
         tags = ?, source = ?, source_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.name,
        input.notes ?? null,
        input.acquiredAt ?? null,
        input.purchasePriceCents ?? null,
        input.currentValueCents ?? null,
        input.customFields ? JSON.stringify(input.customFields) : null,
        tagsToJson(input.tags),
        // Source-link only moves when the caller provides one — manual
        // edits pass undefined and the original attribution stands.
        input.source !== undefined ? input.source : existing.source,
        input.sourceId !== undefined ? input.sourceId : existing.source_id,
        now(),
        id,
      ]
    );

    if (valueChanged) {
      await appendValueHistory(
        tx,
        existing.user_id,
        id,
        input.currentValueCents!,
        input.valueSource
      );
    }
  });
}

// Rows of an item's value trail, oldest first — raw series for the
// portfolio chart (#45 owns the aggregation).
export interface ValueHistoryRow {
  id: string;
  item_id: string;
  value_cents: number;
  recorded_at: string;
  source: string | null;
}

export async function listValueHistory(
  db: AbstractPowerSyncDatabase,
  itemId: string
): Promise<ValueHistoryRow[]> {
  return db.getAll<ValueHistoryRow>(
    `SELECT id, item_id, value_cents, recorded_at, source
       FROM item_value_history
      WHERE item_id = ?
      ORDER BY recorded_at ASC, id ASC`,
    [itemId]
  );
}

export async function deleteItem(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  await db.execute(`DELETE FROM items WHERE id = ?`, [id]);
}

// Normalizes user-entered tags — trim, lowercase, drop empties, dedupe.
// One helper so the form and the data layer agree on what a tag is.
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase();
    if (clean) {
      seen.add(clean);
    }
  }
  return [...seen];
}

// Parses an item row's tags JSON, guarding bad shapes — mirrors
// parseCustomFields: absent/null/malformed all come back as [].
export function parseTags(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === 'string')
      : [];
  } catch {
    return [];
  }
}

// Parses an item row's custom_fields JSON, guarding bad shapes.
export function parseCustomFields(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
