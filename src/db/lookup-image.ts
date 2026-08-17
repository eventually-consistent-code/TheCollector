/**
 * Purpose: Lookup-image sidecar — when an item is created from a metadata
 * prefill that carries an imageUrl, fetch the cover art and save it as the
 * item's first photo. Strictly fire-and-forget: any fetch/save trouble is
 * swallowed so the item save itself never blocks or fails (web CORS
 * included — no proxy here, it just degrades silently).
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';

import { supabase } from '@/auth/client';
import { CARDSIGHT_IMAGE_PREFIX } from '@/metadata/types';

import { clearPendingImage } from './crud';
import { savePhoto } from './photos';

// Constants

// Cover art is a nicety, not a hostage situation — give up after 10s.
const FETCH_TIMEOUT_MS = 10_000;

// Edge-function invoke shape — injectable so tests never touch supabase.
export type MetadataInvokeFn = (body: {
  source: string;
  op: string;
  params: Record<string, string>;
}) => Promise<{ data: unknown; error: unknown }>;

const defaultInvoke: MetadataInvokeFn = (body) =>
  supabase.functions.invoke('metadata', { body });

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

// Pure base64 → bytes. React Native's Hermes has atob in recent versions
// but its Blob never grew arrayBuffer() — so the edge fn ships base64 JSON
// and this decoder needs no platform APIs at all.
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function decodeBase64(input: string): ArrayBuffer {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i + 1 < clean.length; i += 4) {
    const n =
      (B64_ALPHABET.indexOf(clean[i]) << 18) |
      (B64_ALPHABET.indexOf(clean[i + 1]) << 12) |
      ((B64_ALPHABET.indexOf(clean[i + 2]) & 63) << 6) |
      (B64_ALPHABET.indexOf(clean[i + 3]) & 63);
    out.push((n >> 16) & 255);
    if (clean[i + 2] !== undefined) out.push((n >> 8) & 255);
    if (clean[i + 3] !== undefined) out.push(n & 255);
  }
  return new Uint8Array(out).buffer;
}

// CardSight art has no public URL — the sentinel carries the card id, and
// the bytes come back through the metadata function's 'image' op as
// { contentType, base64 } JSON (RN's Blob can't yield bytes, so binary
// transport is off the table). Blob/ArrayBuffer branches remain as
// fallbacks for any environment that still hands binary through.
export async function fetchSentinelImageBytes(
  imageUrl: string,
  invokeFn: MetadataInvokeFn = defaultInvoke
): Promise<ArrayBuffer | null> {
  const id = imageUrl.slice(CARDSIGHT_IMAGE_PREFIX.length);
  if (!id) {
    return null;
  }

  const { data, error } = await invokeFn({ source: 'cardsight', op: 'image', params: { id } });
  if (error || data == null) {
    return null;
  }

  if (typeof data === 'object' && typeof (data as { base64?: unknown }).base64 === 'string') {
    const bytes = decodeBase64((data as { base64: string }).base64);
    return bytes.byteLength > 0 ? bytes : null;
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob && typeof data.arrayBuffer === 'function') {
    const bytes = await data.arrayBuffer();
    return bytes.byteLength > 0 ? bytes : null;
  }
  if (data instanceof ArrayBuffer) {
    return data.byteLength > 0 ? data : null;
  }
  return null;
}

// Everything saveLookupImage needs — fetchFn/save/invokeFn/clearPending are
// injectable for tests.
export interface SaveLookupImageDeps {
  db: AbstractPowerSyncDatabase;
  itemId: string;
  userId: string;
  imageUrl?: string;
  fetchFn?: typeof fetch;
  save?: typeof savePhoto;
  invokeFn?: MetadataInvokeFn;
  clearPending?: typeof clearPendingImage;
}

// Fire-and-forget entry point: no imageUrl is a no-op, and every failure
// path (CORS, timeout, non-image body, save error) just warns and moves on.
// Returns true only when a photo actually landed — the backfill sweeper
// (image-backfill.ts) keys retry decisions off it; UI callers ignore it.
export async function saveLookupImage({
  db,
  itemId,
  userId,
  imageUrl,
  fetchFn = fetch,
  save = savePhoto,
  invokeFn = defaultInvoke,
  clearPending = clearPendingImage,
}: SaveLookupImageDeps): Promise<boolean> {
  if (!imageUrl) {
    return false;
  }

  try {
    // Sentinel urls resolve through the edge function; real https urls keep
    // the plain direct fetch.
    const bytes = imageUrl.startsWith(CARDSIGHT_IMAGE_PREFIX)
      ? await fetchSentinelImageBytes(imageUrl, invokeFn)
      : await fetchImageBytes(imageUrl, fetchFn);
    if (!bytes) {
      return false;
    }
    await save(db, itemId, userId, bytes);

    // Photo landed — the pending-image marker has done its job. Clearing is
    // pure housekeeping, so trouble here never demotes the success.
    try {
      await clearPending(db, itemId);
    } catch {
      // local-only nicety; the next sweep clears it on the retry path
    }
    return true;
  } catch (error) {
    console.warn('lookup image skipped', String(error));
    return false;
  }
}
