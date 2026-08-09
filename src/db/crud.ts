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
}

// Creates a collection, returns its id.
export async function createCollection(
  db: AbstractPowerSyncDatabase,
  input: CreateCollectionInput
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = now();
  await db.execute(
    `INSERT INTO collections (id, name, vertical, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.name, input.vertical, ts, ts]
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
}

// Creates an item in a collection, returns its id.
export async function createItem(
  db: AbstractPowerSyncDatabase,
  collectionId: string,
  input: ItemFieldsInput
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = now();
  await db.execute(
    `INSERT INTO items
       (id, collection_id, name, notes, acquired_at,
        purchase_price_cents, current_value_cents, custom_fields,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      collectionId,
      input.name,
      input.notes ?? null,
      input.acquiredAt ?? null,
      input.purchasePriceCents ?? null,
      input.currentValueCents ?? null,
      input.customFields ? JSON.stringify(input.customFields) : null,
      ts,
      ts,
    ]
  );
  return id;
}

export async function updateItem(
  db: AbstractPowerSyncDatabase,
  id: string,
  input: ItemFieldsInput
): Promise<void> {
  await db.execute(
    `UPDATE items SET
       name = ?, notes = ?, acquired_at = ?,
       purchase_price_cents = ?, current_value_cents = ?, custom_fields = ?,
       updated_at = ?
     WHERE id = ?`,
    [
      input.name,
      input.notes ?? null,
      input.acquiredAt ?? null,
      input.purchasePriceCents ?? null,
      input.currentValueCents ?? null,
      input.customFields ? JSON.stringify(input.customFields) : null,
      now(),
      id,
    ]
  );
}

export async function deleteItem(
  db: AbstractPowerSyncDatabase,
  id: string
): Promise<void> {
  await db.execute(`DELETE FROM items WHERE id = ?`, [id]);
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
