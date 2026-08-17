/**
 * Purpose: Lookup-image sidecar — when an item is created from a metadata
 * prefill that carries an imageUrl, fetch the cover art and save it as the
 * item's first photo. Strictly fire-and-forget: any fetch/save trouble is
 * swallowed so the item save itself never blocks or fails (web CORS
 * included — no proxy here, it just degrades silently).
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';

import { savePhoto } from './photos';

// Constants

// Cover art is a nicety, not a hostage situation — give up after 10s.
const FETCH_TIMEOUT_MS = 10_000;

// Fetches image bytes with a timeout and light content sanity: response
// must be ok, and the content-type must say image/ (or, when the server
// sends no content-type at all, the body must at least be non-empty).
// Returns null on any miss — callers treat null as "skip quietly".
export async function fetchImageBytes(
  url: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<ArrayBuffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      return null;
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
      return null;
    }
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

// Everything saveLookupImage needs — fetchFn/save are injectable for tests.
export interface SaveLookupImageDeps {
  db: AbstractPowerSyncDatabase;
  itemId: string;
  userId: string;
  imageUrl?: string;
  fetchFn?: typeof fetch;
  save?: typeof savePhoto;
}

// Fire-and-forget entry point: no imageUrl is a no-op, and every failure
// path (CORS, timeout, non-image body, save error) just warns and moves on.
export async function saveLookupImage({
  db,
  itemId,
  userId,
  imageUrl,
  fetchFn = fetch,
  save = savePhoto,
}: SaveLookupImageDeps): Promise<void> {
  if (!imageUrl) {
    return;
  }

  try {
    const bytes = await fetchImageBytes(imageUrl, fetchFn);
    if (!bytes) {
      return;
    }
    await save(db, itemId, userId, bytes);
  } catch (error) {
    console.warn('lookup image skipped', String(error));
  }
}
