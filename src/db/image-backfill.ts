/**
 * Purpose: Offline image backfill — items that saved without cover art
 * (offline add, flaky fetch) carry the debt in pending_image_url; this
 * sweeper settles it when connectivity returns. Three attempts per item, in
 * order: the exact url we owed, the CardSight sentinel rebuilt from the
 * source link, and a last-resort re-search by name (auto-applied only on a
 * confident title match). Strictly a background nicety — sequential,
 * capped, every failure swallowed.
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';
import { usePowerSync, useStatus } from '@powersync/react';
import { useEffect, useRef } from 'react';

import { getAdapter } from '@/metadata';
import { CARDSIGHT_IMAGE_PREFIX } from '@/metadata/types';

import { clearPendingImage } from './crud';
import { saveLookupImage } from './lookup-image';

// Constants

// One sweep settles at most this many items — the rest wait their turn;
// the next reconnect (or app launch) picks up where this one left off.
const SWEEP_LIMIT = 10;

// Types

// An item the sweeper still owes a photo — joined to its collection for the
// vertical so attempt (c) knows which adapter to ask.
export interface BackfillCandidate {
  id: string;
  user_id: string;
  name: string | null;
  vertical: string;
  pending_image_url: string | null;
  source: string | null;
  source_id: string | null;
}

// Everything sweepMissingImages needs — all injectable for tests.
export interface SweepDeps {
  db: AbstractPowerSyncDatabase;
  saveImage?: typeof saveLookupImage;
  adapterFor?: typeof getAdapter;
  fetchFn?: typeof fetch;
  clearPending?: typeof clearPendingImage;
  limit?: number;
}

// Helpers

// Collapses a title to bare alphanumerics — lowercase, punctuation and
// whitespace stripped — so "Spider-Man #1" and "spider man 1" agree.
export function normalizeTitle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// The auto-apply guard for attempt (c): only a confident match earns a
// photo without the collector in the loop. Exact-or-startsWith in both
// directions — "The Hobbit" matches "The Hobbit: Deluxe Edition", and
// vice versa; empty titles never match anything.
export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) {
    return false;
  }
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
}

// A definitive miss means the url itself is dead — stop chasing it. 4xx
// minus the transient pair (408 timeout, 429 rate-limit); 5xx and network
// trouble stay pending so the next sweep retries.
function isDefinitiveMiss(status: number | undefined): boolean {
  if (status === undefined || status === 408 || status === 429) {
    return false;
  }
  return status >= 400 && status < 500;
}

// Queries

// Photo-less items worth sweeping, oldest first: no photos row at all, and
// at least one lead to chase (a pending url, a source link, or a name to
// re-search). Capped — this runs on reconnect, not on a schedule.
export async function listBackfillCandidates(
  db: AbstractPowerSyncDatabase,
  limit: number = SWEEP_LIMIT
): Promise<BackfillCandidate[]> {
  return db.getAll<BackfillCandidate>(
    `SELECT i.id, i.user_id, i.name, c.vertical,
            i.pending_image_url, i.source, i.source_id
       FROM items i
       JOIN collections c ON c.id = i.collection_id
      WHERE NOT EXISTS (SELECT 1 FROM photos p WHERE p.item_id = i.id)
        AND (i.pending_image_url IS NOT NULL
             OR i.source_id IS NOT NULL
             OR i.name != '')
      ORDER BY i.created_at ASC, i.id ASC
      LIMIT ?`,
    [limit]
  );
}

// Main

// Settles one item's photo debt — attempts in order, first success wins.
// saveLookupImage clears pending_image_url itself when a photo lands.
async function backfillOne(
  item: BackfillCandidate,
  deps: Required<Omit<SweepDeps, 'limit'>>
): Promise<void> {
  const { db, saveImage, adapterFor, fetchFn, clearPending } = deps;

  // (a) The exact url we owed this item from its original lookup.
  if (item.pending_image_url) {
    // Wrap fetch just to see the status — a 404-ish answer means the url
    // is dead and the marker should go, not loop forever.
    let lastStatus: number | undefined;
    const probeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await fetchFn(input, init);
      lastStatus = response.status;
      return response;
    }) as typeof fetch;

    const saved = await saveImage({
      db,
      itemId: item.id,
      userId: item.user_id,
      imageUrl: item.pending_image_url,
      fetchFn: probeFetch,
    });
    if (saved) {
      return;
    }
    if (isDefinitiveMiss(lastStatus)) {
      await clearPending(db, item.id);
    }
  }

  // (b) CardSight art has no public url — rebuild the sentinel from the
  // source link and let saveLookupImage route it through the edge function.
  if (item.source === 'CardSight' && item.source_id) {
    const saved = await saveImage({
      db,
      itemId: item.id,
      userId: item.user_id,
      imageUrl: `${CARDSIGHT_IMAGE_PREFIX}${item.source_id}`,
      fetchFn,
    });
    if (saved) {
      return;
    }
  }

  // (c) Last resort — re-search the vertical's source by name. Auto-apply
  // ONLY when the top hit's title confidently matches; anything fuzzier
  // waits for the collector to pick art themselves.
  if (!item.name) {
    return;
  }
  const adapter = adapterFor(item.vertical);
  if (!adapter) {
    return;
  }
  const results = await adapter.searchByText(item.name);
  const top = results[0];
  if (!top?.imageUrl || !titlesMatch(top.title, item.name)) {
    return;
  }

  // Persist the found url BEFORE fetching — if the fetch flakes, the next
  // sweep takes the cheap path (a) instead of re-searching.
  await db.execute(`UPDATE items SET pending_image_url = ? WHERE id = ?`, [
    top.imageUrl,
    item.id,
  ]);
  await saveImage({
    db,
    itemId: item.id,
    userId: item.user_id,
    imageUrl: top.imageUrl,
    fetchFn,
  });
}

// Sweep entry point — sequential on purpose (it's a background nicety, not
// a race), and every per-item failure is swallowed so one bad url never
// stalls the rest of the queue.
export async function sweepMissingImages({
  db,
  saveImage = saveLookupImage,
  adapterFor = getAdapter,
  fetchFn = fetch,
  clearPending = clearPendingImage,
  limit = SWEEP_LIMIT,
}: SweepDeps): Promise<void> {
  let candidates: BackfillCandidate[];
  try {
    candidates = await listBackfillCandidates(db, limit);
  } catch (error) {
    console.warn('image backfill query skipped', String(error));
    return;
  }

  for (const item of candidates) {
    try {
      await backfillOne(item, { db, saveImage, adapterFor, fetchFn, clearPending });
    } catch (error) {
      // Transient trouble — leave the item's state alone; next sweep retries.
      console.warn('image backfill skipped', String(error));
    }
  }
}

// Hook

// Mount once in the signed-in layout: sweeps when the app comes up
// connected, and again on every offline→online flip. The prev-ref makes
// the edge detection explicit; the running-ref keeps sweeps one-at-a-time.
export function useImageBackfill(): void {
  const db = usePowerSync();
  const status = useStatus();
  const running = useRef(false);
  const prevConnected = useRef(false);

  useEffect(() => {
    const wasConnected = prevConnected.current;
    prevConnected.current = status.connected;

    // Only the offline→online edge fires (mount-while-connected counts).
    if (!status.connected || wasConnected || running.current) {
      return;
    }

    running.current = true;
    void sweepMissingImages({ db }).finally(() => {
      running.current = false;
    });
  }, [db, status.connected]);
}
