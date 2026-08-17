/**
 * Purpose: Lookup-image tests — content sanity in fetchImageBytes and the
 * fire-and-forget guarantees of saveLookupImage (saves good bytes, skips
 * junk, swallows failures, no-ops without a url).
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';

import {
  fetchImageBytes,
  fetchSentinelImageBytes,
  saveLookupImage,
  type MetadataInvokeFn,
} from '../lookup-image';

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
    ).resolves.toBe(false);

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
    ).resolves.toBe(false);

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('success returns true and clears the pending-image marker', async () => {
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'image/jpeg' }));
    const save = jest.fn(async () => 'photo-1');
    const clearPending = jest.fn(async () => {});

    await expect(
      saveLookupImage({
        db: DB,
        itemId: 'item-1',
        userId: 'user-1',
        imageUrl: 'https://x/cover.jpg',
        fetchFn: asFetch(fetchFn),
        save,
        clearPending,
      })
    ).resolves.toBe(true);

    expect(clearPending).toHaveBeenCalledWith(DB, 'item-1');
  });

  test('failure never touches the pending-image marker', async () => {
    const fetchFn = jest.fn(async () => fakeResponse({ ok: false }));
    const save = jest.fn(async () => 'photo-1');
    const clearPending = jest.fn(async () => {});

    await expect(
      saveLookupImage({
        db: DB,
        itemId: 'item-1',
        userId: 'user-1',
        imageUrl: 'https://x/cover.jpg',
        fetchFn: asFetch(fetchFn),
        save,
        clearPending,
      })
    ).resolves.toBe(false);

    expect(clearPending).not.toHaveBeenCalled();
  });

  test('a clearPending hiccup never demotes the success', async () => {
    const fetchFn = jest.fn(async () => fakeResponse({ contentType: 'image/jpeg' }));
    const save = jest.fn(async () => 'photo-1');
    const clearPending = jest.fn(async () => {
      throw new Error('db closed');
    });

    await expect(
      saveLookupImage({
        db: DB,
        itemId: 'item-1',
        userId: 'user-1',
        imageUrl: 'https://x/cover.jpg',
        fetchFn: asFetch(fetchFn),
        save,
        clearPending,
      })
    ).resolves.toBe(true);
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

// CardSight sentinel — bytes come through the edge function, never a
// direct fetch (the endpoint is keyed; the key lives server-side only).

describe('cardsight image sentinel', () => {
  const asInvoke = (fn: jest.Mock) => fn as unknown as MetadataInvokeFn;

  test('resolves sentinel bytes via the metadata function image op', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const invokeFn = jest.fn(async () => ({
      data: new Blob([bytes], { type: 'image/jpeg' }),
      error: null,
    }));

    const resolved = await fetchSentinelImageBytes('cardsight-image:uuid-1', asInvoke(invokeFn));

    expect(invokeFn).toHaveBeenCalledWith({
      source: 'cardsight',
      op: 'image',
      params: { id: 'uuid-1' },
    });
    expect(resolved?.byteLength).toBe(4);
  });

  test('returns null on invoke error, empty blob, or blank id', async () => {
    const errored = jest.fn(async () => ({ data: null, error: new Error('502') }));
    await expect(
      fetchSentinelImageBytes('cardsight-image:uuid-1', asInvoke(errored))
    ).resolves.toBeNull();

    const empty = jest.fn(async () => ({ data: new Blob([]), error: null }));
    await expect(
      fetchSentinelImageBytes('cardsight-image:uuid-1', asInvoke(empty))
    ).resolves.toBeNull();

    const never = jest.fn();
    await expect(
      fetchSentinelImageBytes('cardsight-image:', asInvoke(never))
    ).resolves.toBeNull();
    expect(never).not.toHaveBeenCalled();
  });

  test('saveLookupImage routes the sentinel to invoke and saves the bytes', async () => {
    const bytes = new Uint8Array([9, 9]).buffer;
    const invokeFn = jest.fn(async () => ({
      data: new Blob([bytes], { type: 'image/png' }),
      error: null,
    }));
    const fetchFn = jest.fn();
    const save = jest.fn(async () => 'photo-1');

    await saveLookupImage({
      db: DB,
      itemId: 'item-1',
      userId: 'user-1',
      imageUrl: 'cardsight-image:uuid-9',
      fetchFn: asFetch(fetchFn),
      save,
      invokeFn: asInvoke(invokeFn),
    });

    // Sentinel never touches direct fetch; bytes land in savePhoto.
    expect(fetchFn).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(DB, 'item-1', 'user-1', expect.any(ArrayBuffer));
  });

  test('saveLookupImage swallows an invoke rejection without throwing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const invokeFn = jest.fn(async () => {
      throw new Error('relay down');
    });
    const save = jest.fn();

    await expect(
      saveLookupImage({
        db: DB,
        itemId: 'item-1',
        userId: 'user-1',
        imageUrl: 'cardsight-image:uuid-9',
        save,
        invokeFn: asInvoke(invokeFn),
      })
    ).resolves.toBe(false);

    expect(save).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// Base64 transport (RN-safe path)

import { decodeBase64 } from '../lookup-image';

describe('decodeBase64', () => {
  it('decodes to the exact bytes', () => {
    const bytes = new Uint8Array(decodeBase64('SGVsbG8='));
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it('handles unpadded and whitespace-laced input', () => {
    const bytes = new Uint8Array(decodeBase64('SGVs\nbG8'));
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });
});

describe('fetchSentinelImageBytes base64 payload', () => {
  it('resolves {base64} JSON into bytes', async () => {
    const invoke = jest.fn(async () => ({
      data: { contentType: 'image/jpeg', base64: 'SGVsbG8=' },
      error: null,
    }));
    const bytes = await fetchSentinelImageBytes('cardsight-image:abc', invoke);
    expect(bytes).not.toBeNull();
    expect(new Uint8Array(bytes!).length).toBe(5);
  });
});
