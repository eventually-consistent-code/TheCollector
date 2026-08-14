/**
 * Purpose: Reactive read hooks over PowerSync watch queries, plus the
 * provider-bound db handle. Screens consume these; writes go through crud.ts.
 * Author(s): John Reed
 */

import { useQuery, usePowerSync } from '@powersync/react';

import { buildSearchQuery, orderByFor, DEFAULT_SORT } from './query';
import type { ItemSort } from './query';
import type { CollectionRecord, ItemRecord } from './schema';

// Re-export so screens have one import surface for the live db.
export { usePowerSync };

// A search hit is an item plus its collection's label bits.
export type SearchItemRow = ItemRecord & {
  collection_name: string;
  collection_vertical: string;
};

// Table-less no-op for the empty-search case: zero rows, and PowerSync finds
// no dependent tables to watch, so nothing ever re-runs.
const NO_RESULTS_SQL = `SELECT 0 WHERE 0`;

// All collections, newest first; updates live as rows change.
export function useCollections() {
  return useQuery<CollectionRecord>(
    `SELECT * FROM collections ORDER BY created_at DESC`
  );
}

// One collection by id.
export function useCollection(id: string | undefined) {
  return useQuery<CollectionRecord>(`SELECT * FROM collections WHERE id = ?`, [
    id ?? null,
  ]);
}

// Items within a collection, sorted per the caller (newest first by default).
export function useItems(
  collectionId: string | undefined,
  sort: ItemSort = DEFAULT_SORT
) {
  return useQuery<ItemRecord>(
    `SELECT * FROM items WHERE collection_id = ? ORDER BY ${orderByFor(sort)}`,
    [collectionId ?? null]
  );
}

// Cross-collection search over name, notes, and custom-field values, labeled
// with each hit's collection name + vertical. Empty/whitespace query returns
// an empty result set without touching the item tables.
export function useSearchItems(query: string) {
  const built = buildSearchQuery(query);
  return useQuery<SearchItemRow>(
    built ? built.sql : NO_RESULTS_SQL,
    built ? built.params : []
  );
}

// One item by id.
export function useItem(id: string | undefined) {
  return useQuery<ItemRecord>(`SELECT * FROM items WHERE id = ?`, [id ?? null]);
}
