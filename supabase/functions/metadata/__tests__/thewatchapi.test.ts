/**
 * Purpose: Timepieces source tests — model-search request shape, the
 * UPC→title bridge hop with noise stripping, cache-hit short-circuit,
 * key-missing degradation, and the quota/throttle friendly message.
 * Exercises the module against fakes, no Deno and no live quota spent.
 * Author(s): John Reed
 */

import { type LookupCacheDb } from '../lookup_cache';
import {
  isBarcodeQuery,
  stripNoise,
  timepiecesSearch,
  LIMIT_MESSAGE,
  UNAVAILABLE_MESSAGE,
  type TimepiecesDeps,
} from '../thewatchapi';

// Fake db — same in-memory slice as lookup_cache.test.ts.
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

// Fake fetch — one canned status/body, plus a recorder for the URL.
function fakeFetch(status: number, body: unknown = {}) {
  const fetchFn = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.Mock;
  return fetchFn;
}

function makeDeps(overrides: Partial<TimepiecesDeps> = {}): TimepiecesDeps & { upserts: unknown[] } {
  const { db, upserts } = fakeDb();
  return {
    db,
    apiToken: 'TEST_TOKEN',
    fetchFn: fakeFetch(200, { data: [] }) as unknown as typeof fetch,
    resolveUpc: jest.fn(async () => null),
    ...overrides,
    upserts,
  };
}

function requestedUrl(fetchFn: unknown): URL {
  return new URL((fetchFn as jest.Mock).mock.calls[0][0] as string);
}

// Query classification

describe('isBarcodeQuery', () => {
  it('accepts 12-digit UPC and 13-digit EAN', () => {
    expect(isBarcodeQuery('036000291452')).toBe(true);
    expect(isBarcodeQuery('4901234567894')).toBe(true);
  });

  it('rejects short digit runs and ordinary text', () => {
    expect(isBarcodeQuery('116610')).toBe(false);
    expect(isBarcodeQuery('rolex submariner')).toBe(false);
  });
});

// Noise stripping

describe('stripNoise', () => {
  it('drops colors, gender cuts, and the word watch — keeps the reference', () => {
    expect(stripNoise("Casio Men's G-Shock DW5600E-1V Black Resin Watch")).toBe(
      'Casio G-Shock DW5600E-1V Resin',
    );
  });

  it('falls back to the original title when everything is noise', () => {
    expect(stripNoise('Black Watch')).toBe('Black Watch');
  });
});

// Reference/text search

describe('timepiecesSearch — text', () => {
  it('hits model search with token, attributes, and the normalized query; caches the payload', async () => {
    const payload = { data: [{ brand: 'Rolex', reference_number: '116610LN' }] };
    const fetchFn = fakeFetch(200, payload);
    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    const result = await timepiecesSearch('  Rolex   Submariner ', deps);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe('https://api.thewatchapi.com/v1/model/search');
    expect(url.searchParams.get('api_token')).toBe('TEST_TOKEN');
    expect(url.searchParams.get('search')).toBe('rolex submariner');
    expect(url.searchParams.get('search_attributes')).toBe('brand,model,reference_number,description');
    expect(result).toEqual(payload);
    expect(deps.upserts).toEqual([{ source: 'timepieces', query: 'rolex submariner', payload }]);
  });

  it('second identical query is a cache hit — no second upstream call', async () => {
    const fetchFn = fakeFetch(200, { data: [{ brand: 'Omega' }] });
    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    const first = await timepiecesSearch('Omega Speedmaster', deps);
    const second = await timepiecesSearch('omega  SPEEDMASTER', deps);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});

// UPC bridge path

describe('timepiecesSearch — barcode', () => {
  it('resolves digits through the UPC bridge and searches the stripped title', async () => {
    const fetchFn = fakeFetch(200, { data: [] });
    const resolveUpc = jest.fn(async () => "Casio Men's G-Shock DW5600E-1V Black Resin Watch");
    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch, resolveUpc });

    await timepiecesSearch('079767891404', deps);

    expect(resolveUpc).toHaveBeenCalledWith('079767891404');
    expect(requestedUrl(fetchFn).searchParams.get('search')).toBe('casio g-shock dw5600e-1v resin');
  });

  it('unknown barcode degrades to a friendly miss without an upstream call', async () => {
    const fetchFn = fakeFetch(200, { data: [] });
    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    const result = (await timepiecesSearch('079767891404', deps)) as { data: unknown[]; message?: string };

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.message).toContain('barcode not recognized');
  });
});

// Degradation

describe('timepiecesSearch — degraded modes', () => {
  it('missing key returns source-unavailable, never crashes or fetches', async () => {
    const fetchFn = fakeFetch(200, { data: [] });
    const resolveUpc = jest.fn();
    const deps = makeDeps({ apiToken: undefined, fetchFn: fetchFn as unknown as typeof fetch, resolveUpc });

    const result = await timepiecesSearch('rolex', deps);

    expect(result).toEqual({ data: [], unavailable: true, message: UNAVAILABLE_MESSAGE });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(resolveUpc).not.toHaveBeenCalled();
  });

  it('429 throttle returns the friendly limit message and caches nothing', async () => {
    const deps = makeDeps({ fetchFn: fakeFetch(429) as unknown as typeof fetch });

    const result = await timepiecesSearch('rolex daytona', deps);

    expect(result).toEqual({ data: [], limited: true, message: LIMIT_MESSAGE });
    expect(deps.upserts).toEqual([]);
  });

  it('402 daily quota gets the same friendly message', async () => {
    const deps = makeDeps({ fetchFn: fakeFetch(402) as unknown as typeof fetch });

    const result = await timepiecesSearch('rolex daytona', deps);

    expect(result).toEqual({ data: [], limited: true, message: LIMIT_MESSAGE });
    expect(deps.upserts).toEqual([]);
  });

  it('a hard upstream failure still throws — bad responses are never cached', async () => {
    const deps = makeDeps({ fetchFn: fakeFetch(500) as unknown as typeof fetch });

    await expect(timepiecesSearch('rolex', deps)).rejects.toThrow('thewatchapi 500');
    expect(deps.upserts).toEqual([]);
  });
});
