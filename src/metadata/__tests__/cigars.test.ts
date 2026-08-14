/**
 * Purpose: Cigars vertical tests — seed dataset sanity, the fuzzy matcher
 * (exact, noisy, box-count parse, confidence floor), local text search, and
 * the UPC → title → match flow through the mocked edge fn.
 * Author(s): John Reed
 */

import { FunctionsHttpError } from '@supabase/supabase-js';

// The real client throws without env vars and drags in RN internals; the
// metadata layer only touches functions.invoke.
jest.mock('@/auth/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '@/auth/client';
import { TEMPLATES } from '@/templates';

import type { CigarEntry } from '../../../supabase/functions/metadata/cigar-match';
import {
  CIGAR_CONFIDENCE_FLOOR,
  matchCigarTitle,
  parseBoxCount,
  searchCigars,
} from '../../../supabase/functions/metadata/cigar-match';
import { cigarsAdapter } from '../adapters/cigars';
import { getAdapter, scanLookup } from '../index';

const SEED = require('../../../supabase/functions/metadata/cigars-data.json') as CigarEntry[];

const invoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  invoke.mockReset();
});

// Seed dataset sanity

describe('cigars seed dataset', () => {
  it('covers at least 50 brands', () => {
    const brands = new Set(SEED.map((e) => e.brand));
    expect(brands.size).toBeGreaterThanOrEqual(50);
  });

  it('every row carries the full field set with plausible sizes', () => {
    for (const entry of SEED) {
      expect(typeof entry.brand).toBe('string');
      expect(entry.brand.length).toBeGreaterThan(0);
      expect(typeof entry.line).toBe('string');
      expect(entry.line.length).toBeGreaterThan(0);
      expect(typeof entry.vitola).toBe('string');
      expect(entry.vitola.length).toBeGreaterThan(0);
      expect(typeof entry.wrapper).toBe('string');
      expect(typeof entry.binder).toBe('string');
      expect(typeof entry.filler).toBe('string');
      expect(typeof entry.country).toBe('string');
      // Ring gauges run ~26 (petit) to ~70 (novelty gordo); lengths 3-10".
      expect(entry.ring_gauge).toBeGreaterThanOrEqual(26);
      expect(entry.ring_gauge).toBeLessThanOrEqual(70);
      expect(entry.length_inches).toBeGreaterThanOrEqual(3);
      expect(entry.length_inches).toBeLessThanOrEqual(10);
      if (entry.release_year !== null) {
        expect(entry.release_year).toBeGreaterThanOrEqual(1900);
        expect(entry.release_year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it('flagship lines keep 2-4 standard vitolas', () => {
    const perLine = new Map<string, number>();
    for (const entry of SEED) {
      const key = `${entry.brand}|${entry.line}`;
      perLine.set(key, (perLine.get(key) ?? 0) + 1);
    }
    expect(perLine.get('Padrón|1964 Anniversary')).toBe(4);
    expect(perLine.get('Arturo Fuente|Hemingway')).toBe(4);
    expect(perLine.get('Cohiba|Behike')).toBe(3);
  });
});

// Fuzzy matcher — UPC titles

describe('matchCigarTitle', () => {
  it('matches a clean retail title exactly, with box count', () => {
    const match = matchCigarTitle('Arturo Fuente Hemingway Short Story Natural Box of 25', SEED);

    expect(match).not.toBeNull();
    expect(match!.entry).toMatchObject({
      brand: 'Arturo Fuente',
      line: 'Hemingway',
      vitola: 'Short Story',
    });
    expect(match!.confidence).toBe(1);
    expect(match!.boxCount).toBe(25);
  });

  it('survives a noisy, partial title', () => {
    // "Arturo" missing, retail filler present — brand still gates through.
    const match = matchCigarTitle('Fuente Hemingway Short Story Cigars 6-Pack', SEED);

    expect(match).not.toBeNull();
    expect(match!.entry.vitola).toBe('Short Story');
    expect(match!.confidence).toBeCloseTo(0.75, 2);
    expect(match!.boxCount).toBe(6);
  });

  it('handles accents going both ways', () => {
    const match = matchCigarTitle('Padron 1926 Serie No. 9 Maduro', SEED);

    expect(match).not.toBeNull();
    expect(match!.entry).toMatchObject({ brand: 'Padrón', line: '1926 Serie', vitola: 'No. 9' });
  });

  it('returns null for a non-cigar title', () => {
    expect(matchCigarTitle('Sony PlayStation 5 Console Disc Edition', SEED)).toBeNull();
  });

  it('refuses a brand-only hit below the confidence floor', () => {
    // Brand alone scores 0.5 — under the 0.6 floor, so no guessing.
    expect(CIGAR_CONFIDENCE_FLOOR).toBeGreaterThan(0.5);
    expect(matchCigarTitle('Davidoff gift set', SEED)).toBeNull();
  });
});

describe('parseBoxCount', () => {
  it('parses the common retail phrasings', () => {
    expect(parseBoxCount('Box of 25')).toBe(25);
    expect(parseBoxCount('Tin of 10')).toBe(10);
    expect(parseBoxCount('25 Count Box')).toBe(25);
    expect(parseBoxCount('20ct')).toBe(20);
    expect(parseBoxCount('5-Pack')).toBe(5);
  });

  it('ignores absent or implausible counts', () => {
    expect(parseBoxCount('Robusto Natural')).toBeUndefined();
    expect(parseBoxCount('Box of 500')).toBeUndefined();
  });
});

// Local text search over the seed

describe('searchCigars', () => {
  it('ranks brand+line hits above brand-only hits', () => {
    const results = searchCigars('padron 1964', SEED);

    expect(results.length).toBeGreaterThan(4);
    expect(results[0].entry.brand).toBe('Padrón');
    expect(results[0].entry.line).toBe('1964 Anniversary');
    // All four 1964 Anniversary vitolas outrank the 1926 Serie rows.
    expect(results.slice(0, 4).every((r) => r.entry.line === '1964 Anniversary')).toBe(true);
  });

  it('returns empty for blank or unmatched queries', () => {
    expect(searchCigars('   ', SEED)).toEqual([]);
    expect(searchCigars('xylophone quartz', SEED)).toEqual([]);
  });
});

// Adapter mapping + registry

describe('cigars adapter', () => {
  it('is registered for the cigars vertical', () => {
    expect(getAdapter('cigars')).toBe(cigarsAdapter);
    expect(cigarsAdapter.templateId).toBe('cigars');
  });

  it('maps only known template field keys', () => {
    const template = TEMPLATES.find((t) => t.id === 'cigars')!;
    expect(template).toBeDefined();
    const keys = template.fields.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'brand', 'line', 'vitola', 'wrapper', 'binder', 'filler',
        'ring_gauge', 'length_inches', 'country', 'release_year', 'box_count',
      ])
    );
  });

  it('searches the seed locally and maps entries onto template fields', async () => {
    const results = await cigarsAdapter.searchByText('oliva serie v melanio');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Oliva Serie V Melanio');
    expect(results[0].source).toBe('Cigar dataset');
    expect(results[0].fields).toMatchObject({
      brand: 'Oliva',
      line: 'Serie V Melanio',
      wrapper: 'Ecuadorian Sumatra',
      country: 'Nicaragua',
      release_year: 2012,
    });
    // Local search — no network, no proxy.
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns empty on a hopeless query', async () => {
    await expect(cigarsAdapter.searchByText('qqq wxyz')).resolves.toEqual([]);
  });
});

// UPC → title → match flow (mocked edge fn)

describe('cigars barcode flow', () => {
  const shortStory = SEED.find((e) => e.vitola === 'Short Story')!;

  it('resolves a UPC through the cigars source in one round trip', async () => {
    invoke.mockResolvedValue({
      data: {
        title: 'Arturo Fuente Hemingway Short Story Natural Box of 25',
        match: shortStory,
        confidence: 1,
        box_count: 25,
      },
      error: null,
    });

    const outcome = await scanLookup('cigars', '812615001234', 'upc_a');

    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'cigars', op: 'lookup', params: { upc: '812615001234' } },
    });
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].fields).toMatchObject({
      brand: 'Arturo Fuente',
      line: 'Hemingway',
      vitola: 'Short Story',
      box_count: 25,
    });
  });

  it('falls back to the bridge title when the server match is under the floor', async () => {
    invoke
      // cigars lookup: title resolved, but nothing cleared the floor.
      .mockResolvedValueOnce({
        data: { title: 'Some Unrecognized Cigar Sampler', match: null, confidence: 0, box_count: null },
        error: null,
      })
      // bridge lookup: same title, cached by the first call.
      .mockResolvedValueOnce({
        data: { title: 'Arturo Fuente Hemingway Short Story Natural Box of 25', cached: true },
        error: null,
      });

    const outcome = await scanLookup('cigars', '036000291452', 'upc_a');

    // Local search over the bridged title still finds the row.
    expect(outcome.bridgeTitle).toBe('Arturo Fuente Hemingway Short Story Natural Box of 25');
    expect(outcome.results[0].fields).toMatchObject({ vitola: 'Short Story' });
  });

  it('treats an unknown barcode as a miss, not a failure', async () => {
    const context = { status: 404, json: async () => ({ error: 'unknown barcode' }) };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(context) });

    await expect(cigarsAdapter.lookupByBarcode!('000000000000')).resolves.toEqual([]);
  });

  it('skips the proxy entirely for non-UPC input', async () => {
    await expect(cigarsAdapter.lookupByBarcode!('not-a-upc')).resolves.toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });
});
