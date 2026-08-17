/**
 * Purpose: Lookup-image tests — content sanity in fetchImageBytes and the
 * fire-and-forget guarantees of saveLookupImage (saves good bytes, skips
 * junk, swallows failures, no-ops without a url).
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';

import { fetchImageBytes, saveLookupImage } from '../lookup-image';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

// lookup-image.ts pulls in photos.ts → the supabase client (AsyncStorage
// native module) — these tests inject their own save fn, so stub it out.
jest.mock('@/auth/client', () => ({ supabase: { storage: {} } }));

// Fake fetch responses — just the surface fetchImageBytes touches.
function fakeResponse({
  ok = true,
  contentType,
  bytes = new ArrayBuffer(4),
}: {
  ok?: boolean;
  contentType?: string;
  bytes?: ArrayBuffer;
}) {
  return {
    ok,
    headers: { get: (name: string) => (name === 'content-type' ? (contentType ?? null) : null) },
    arrayBuffer: async () => bytes,
  } as unknown as Response;
}

const asFetch = (fn: jest.Mock) => fn as unknown as typeof fetch;

// A db stand-in — the injected save fn is the only thing that touches it.
const DB = {} as AbstractPowerSyncDatabase;

describe('fetchImageBytes', () => {
  test('returns bytes for an ok image/ response', async () => {
    const bytes = new ArrayBuffer(8);
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'image/jpeg', bytes }));
    await expect(fetchImageBytes('https://x/cover.jpg', asFetch(fetchFn))).resolves.toBe(bytes);
  });

  test('returns null for a non-ok response', async () => {
    const fetchFn = jest.fn(async () => fakeResponse({ ok: false, contentType: 'image/jpeg' }));
    await expect(fetchImageBytes('https://x/cover.jpg', asFetch(fetchFn))).resolves.toBeNull();
  });

  test('returns null for a non-image content-type', async () => {
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'text/html' }));
    await expect(fetchImageBytes('https://x/cover.jpg', asFetch(fetchFn))).resolves.toBeNull();
  });

  test('missing content-type: non-empty bytes pass, empty bytes are null', async () => {
    const bytes = new ArrayBuffer(4);
    const full = jest.fn(async () => fakeResponse({ bytes }));
    const empty = jest.fn(async () => fakeResponse({ bytes: new ArrayBuffer(0) }));
    await expect(fetchImageBytes('https://x/a', asFetch(full))).resolves.toBe(bytes);
    await expect(fetchImageBytes('https://x/b', asFetch(empty))).resolves.toBeNull();
  });

  test('passes an abort signal through to fetch', async () => {
    const fetchFn = jest.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return fakeResponse({ contentType: 'image/png' });
    });
    await fetchImageBytes('https://x/cover.png', asFetch(fetchFn));
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('saveLookupImage', () => {
  test('saves fetched bytes through savePhoto', async () => {
    const bytes = new ArrayBuffer(8);
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'image/jpeg', bytes }));
    const save = jest.fn(async () => 'photo-1');

    await saveLookupImage({
      db: DB,
      itemId: 'item-1',
      userId: 'user-1',
      imageUrl: 'https://x/cover.jpg',
      fetchFn: asFetch(fetchFn),
      save,
    });

    expect(save).toHaveBeenCalledWith(DB, 'item-1', 'user-1', bytes);
  });

  test('skips save on a non-image content-type', async () => {
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'text/html' }));
    const save = jest.fn(async () => 'photo-1');

    await saveLookupImage({
      db: DB,
      itemId: 'item-1',
      userId: 'user-1',
      imageUrl: 'https://x/cover.jpg',
      fetchFn: asFetch(fetchFn),
      save,
    });

    expect(save).not.toHaveBeenCalled();
  });

  test('swallows a fetch rejection (CORS, network) without throwing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const save = jest.fn(async () => 'photo-1');

    await expect(
      saveLookupImage({
        db: DB,
        itemId: 'item-1',
        userId: 'user-1',
        imageUrl: 'https://x/cover.jpg',
        fetchFn: asFetch(fetchFn),
        save,
      })
    ).resolves.toBeUndefined();

    expect(save).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('swallows a save failure without throwing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'image/jpeg' }));
    const save = jest.fn(async () => {
      throw new Error('disk full');
    });

    await expect(
      saveLookupImage({
        db: DB,
        itemId: 'item-1',
        userId: 'user-1',
        imageUrl: 'https://x/cover.jpg',
        fetchFn: asFetch(fetchFn),
        save,
      })
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('no imageUrl is a no-op — fetch never fires', async () => {
    const fetchFn = jest.fn();
    const save = jest.fn();

    await saveLookupImage({
      db: DB,
      itemId: 'item-1',
      userId: 'user-1',
      fetchFn: asFetch(fetchFn),
      save,
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
