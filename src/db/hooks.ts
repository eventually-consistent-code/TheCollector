/**
 * Purpose: Reactive read hooks over PowerSync watch queries, plus the
 * provider-bound db handle. Screens consume these; writes go through crud.ts.
 * Author(s): John Reed
 */

import { useQuery, usePowerSync } from '@powersync/react';

import type { CollectionRecord, ItemRecord } from './schema';

// Re-export so screens have one import surface for the live db.
export { usePowerSync };

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

// Items within a collection, newest first.
export function useItems(collectionId: string | undefined) {
  return useQuery<ItemRecord>(
    `SELECT * FROM items WHERE collection_id = ? ORDER BY created_at DESC`,
    [collectionId ?? null]
  );
}

// One item by id.
export function useItem(id: string | undefined) {
  return useQuery<ItemRecord>(`SELECT * FROM items WHERE id = ?`, [id ?? null]);
}
