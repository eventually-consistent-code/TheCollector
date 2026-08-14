/**
 * Purpose: Lookup-cache helper tests — the one normalizer, cache miss →
 * fetch + permanent store, cache hit → no upstream call. Exercises the
 * helper against a fake db slice, no Deno required.
 * Author(s): John Reed
 */

import {
  cacheGet,
  cacheSet,
  cachedSearch,
  normalizeQuery,
  type LookupCacheDb,
} from '../lookup_cache';

// Fake db — an in-memory Map behind the same chain the helper uses, plus a
// recorder so tests can assert exactly what got written. Keys join source
// and query on a NUL byte, which no normalized query can contain.
const SEP = String.fromCharCode(0);

function fakeDb(seed: Array<{ source: string; query: string; payload: unknown }> = []) {
  const rows = new Map<string, unknown>();
  for (const row of seed) rows.set(`${row.source}${SEP}${row.query}`, row.payload);

  const upserts: Array<{ source: string; query: string; payload: unknown }> = [];

  const db: LookupCacheDb = {
    from: () => ({
      select: () => ({
        eq: (_sourceColumn: string, source: string) => ({
          eq: (_queryColumn: string, query: string) => ({
            maybeSingle: async () => {
              const key = `${source}${SEP}${query}`;
              return { data: rows.has(key) ? { payload: rows.get(key) } : null };
            },
          }),
        }),
      }),
      upsert: (row: { source: string; query: string; payload: unknown }) => {
        upserts.push(row);
        rows.set(`${row.source}${SEP}${row.query}`, row.payload);
        return { select: () => ({ maybeSingle: async () => null }) };
      },
    }),
  };

  return { db, upserts };
}

// Normalizer

describe('normalizeQuery', () => {
  it('lowercases, trims, and collapses inner whitespace', () => {
    expect(normalizeQuery('  Dune   Messiah ')).toBe('dune messiah');
  });

  it('collapses tabs and newlines too', () => {
    expect(normalizeQuery('Rolex\t Submariner\n Date')).toBe('rolex submariner date');
  });

  it('leaves an already-clean query alone', () => {
    expect(normalizeQuery('padron 1964 anniversary')).toBe('padron 1964 anniversary');
  });

  it('reduces whitespace-only input to empty', () => {
    expect(normalizeQuery('  \t\n ')).toBe('');
  });
});

// Write-through search

describe('cachedSearch', () => {
  it('cache miss → calls the fetcher with the normalized query and stores the payload', async () => {
    const { db, upserts } = fakeDb();
    const fetcher = jest.fn().mockResolvedValue({ docs: [{ title: 'Dune Messiah' }] });

    const result = await cachedSearch(db, 'openlibrary', '  Dune   Messiah ', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('dune messiah');
    expect(result).toEqual({ payload: { docs: [{ title: 'Dune Messiah' }] }, cached: false });
    expect(upserts).toEqual([
      { source: 'openlibrary', query: 'dune messiah', payload: { docs: [{ title: 'Dune Messiah' }] } },
    ]);
  });

  it('cache hit → returns the stored payload without any external call', async () => {
    const { db, upserts } = fakeDb([
      { source: 'openlibrary', query: 'dune messiah', payload: { docs: [] } },
    ]);
    const fetcher = jest.fn();

    const result = await cachedSearch(db, 'openlibrary', 'dune messiah', fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ payload: { docs: [] }, cached: true });
    expect(upserts).toEqual([]);
  });

  it('messy variants of the same query hit the same row', async () => {
    const { db } = fakeDb();
    const fetcher = jest.fn().mockResolvedValue({ hit: 1 });

    await cachedSearch(db, 'artic', 'Starry  Night', fetcher);
    const second = await cachedSearch(db, 'artic', '  STARRY NIGHT ', fetcher);

    // One upstream call ever, both spellings land on one cached row.
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ payload: { hit: 1 }, cached: true });
  });

  it('keys the cache per source — same query, different source, fresh fetch', async () => {
    const { db } = fakeDb([{ source: 'openlibrary', query: 'dune', payload: { docs: [] } }]);
    const fetcher = jest.fn().mockResolvedValue({ art: true });

    const result = await cachedSearch(db, 'artic', 'dune', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
  });

  it('fetcher failure propagates and nothing is cached', async () => {
    const { db, upserts } = fakeDb();
    const fetcher = jest.fn().mockRejectedValue(new Error('openlibrary 503'));

    await expect(cachedSearch(db, 'openlibrary', 'dune', fetcher)).rejects.toThrow(
      'openlibrary 503',
    );
    expect(upserts).toEqual([]);
  });
});

// Direct get/set

describe('cacheGet / cacheSet', () => {
  it('cacheSet normalizes the key on write', async () => {
    const { db, upserts } = fakeDb();

    await cacheSet(db, 'ebay', '  Omega  SPEEDMASTER ', { total: 3 });

    expect(upserts).toEqual([{ source: 'ebay', query: 'omega speedmaster', payload: { total: 3 } }]);
  });

  it('cacheGet normalizes the key on read', async () => {
    const { db } = fakeDb([{ source: 'ebay', query: 'omega speedmaster', payload: { total: 3 } }]);

    await expect(cacheGet(db, 'ebay', ' Omega   Speedmaster')).resolves.toEqual({ total: 3 });
  });

  it('cacheGet misses cleanly', async () => {
    const { db } = fakeDb();

    await expect(cacheGet(db, 'ebay', 'nothing here')).resolves.toBeNull();
  });
});
