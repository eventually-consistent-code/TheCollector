/**
 * Purpose: Metadata layer tests — barcode normalization, registry
 * resolution, result→field mapping, proxy error unwrapping, and the
 * scan orchestration (direct barcode vs bridge path).
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

import { legoAdapter, looksLikeSetNumber } from '../adapters/lego';
import { funkoAdapter } from '../adapters/funko';
import { vinylAdapter } from '../adapters/vinyl';
import { bridgeLookup } from '../bridge';
import { getAdapter, scanLookup } from '../index';
import { MetadataProxyError } from '../proxy';
import { normalizeBarcode } from '../upc';

const invoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  invoke.mockReset();
});

// Barcode normalization

describe('normalizeBarcode', () => {
  it('collapses iOS ean13-with-leading-zero to upc_a', () => {
    expect(normalizeBarcode('0074312555162', 'ean13')).toEqual({
      value: '074312555162',
      type: 'upc_a',
    });
  });

  it('leaves a true ean13 alone', () => {
    expect(normalizeBarcode('4006381333931', 'ean13')).toEqual({
      value: '4006381333931',
      type: 'ean13',
    });
  });

  it('leaves upc_a alone', () => {
    expect(normalizeBarcode('036000291452', 'upc_a')).toEqual({
      value: '036000291452',
      type: 'upc_a',
    });
  });

  it('passes non-numeric QR data through untouched', () => {
    expect(normalizeBarcode('https://example.com/x', 'qr')).toEqual({
      value: 'https://example.com/x',
      type: 'qr',
    });
  });
});

// Registry

describe('registry', () => {
  it('resolves an adapter for every vertical except the manual-only set', () => {
    // Manual entry BY DESIGN — no lookup source (see src/metadata/index.ts).
    const manualOnly = new Set(['other']);
    for (const template of TEMPLATES) {
      const adapter = getAdapter(template.id);
      if (manualOnly.has(template.id)) {
        expect(adapter).toBeUndefined();
      } else {
        expect(adapter).toBeDefined();
        expect(adapter!.templateId).toBe(template.id);
      }
    }
  });

  it('maps only known template field keys', () => {
    // Every adapter's mapped field keys must exist on its template —
    // checked here for the fixtures exercised below.
    const vinylTemplate = TEMPLATES.find((t) => t.id === 'vinyl')!;
    const keys = vinylTemplate.fields.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(['artist', 'label', 'catalog_number', 'release_year']));
  });
});

// Discogs mapping

describe('vinyl adapter', () => {
  const release = {
    title: 'Miles Davis - Kind Of Blue',
    year: '1959',
    label: ['Columbia'],
    catno: 'CL 1355',
    thumb: 'https://img.discogs.com/thumb.jpg',
  };

  it('maps a discogs release onto template fields', async () => {
    invoke.mockResolvedValue({ data: { results: [release] }, error: null });

    const results = await vinylAdapter.searchByText('kind of blue');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Kind Of Blue');
    expect(results[0].fields).toEqual({
      artist: 'Miles Davis',
      label: 'Columbia',
      catalog_number: 'CL 1355',
      release_year: 1959,
    });
  });

  it('sends the barcode through the lookup op', async () => {
    invoke.mockResolvedValue({ data: { results: [] }, error: null });

    await vinylAdapter.lookupByBarcode!('074646493526');

    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'discogs', op: 'lookup', params: { barcode: '074646493526' } },
    });
  });
});

// Proxy error unwrapping

describe('proxy errors', () => {
  it('unwraps FunctionsHttpError into MetadataProxyError with status + detail', async () => {
    const context = {
      status: 429,
      json: async () => ({ error: 'upc bridge rate-limited — try later' }),
    };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(context) });

    await expect(vinylAdapter.searchByText('x')).rejects.toMatchObject({
      name: 'MetadataProxyError',
      status: 429,
      message: 'upc bridge rate-limited — try later',
    });
  });

  it('bridgeLookup treats 404 as a miss, not a failure', async () => {
    const context = { status: 404, json: async () => ({ error: 'unknown barcode' }) };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(context) });

    await expect(bridgeLookup('036000291452')).resolves.toBeNull();
  });

  it('rethrows non-404 bridge errors', async () => {
    const context = { status: 500, json: async () => ({ error: 'boom' }) };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(context) });

    await expect(bridgeLookup('036000291452')).rejects.toBeInstanceOf(MetadataProxyError);
  });
});

// Scan orchestration

describe('scanLookup', () => {
  it('uses the direct barcode index when the vertical has one (vinyl)', async () => {
    invoke.mockResolvedValue({
      data: { results: [{ title: 'Artist - Album', year: '2001' }] },
      error: null,
    });

    const outcome = await scanLookup('vinyl', '0074646493526', 'ean13');

    expect(outcome.results).toHaveLength(1);
    expect(outcome.bridgeTitle).toBeUndefined();
    // Normalized to upc_a before hitting Discogs.
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'discogs', op: 'lookup', params: { barcode: '074646493526' } },
    });
  });

  it('bridges UPC → title → text search for bridge verticals (lego)', async () => {
    invoke
      .mockResolvedValueOnce({ data: { title: 'LEGO 75192 Millennium Falcon', cached: true }, error: null })
      .mockResolvedValueOnce({
        data: { results: [{ set_num: '75192-1', name: 'Millennium Falcon', year: 2017, num_parts: 7541 }] },
        error: null,
      });

    const outcome = await scanLookup('lego', '673419265102', 'upc_a');

    expect(outcome.bridgeTitle).toBe('LEGO 75192 Millennium Falcon');
    expect(outcome.results[0].fields).toEqual({
      set_number: '75192-1',
      release_year: 2017,
      piece_count: 7541,
    });
  });

  it('returns empty for a bridge miss', async () => {
    const context = { status: 404, json: async () => ({ error: 'unknown barcode' }) };
    invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(context) });

    const outcome = await scanLookup('lego', '000000000000', 'upc_a');

    expect(outcome.results).toEqual([]);
    expect(outcome.bridgeTitle).toBeUndefined();
  });

  it('returns empty for an unmapped vertical', async () => {
    const outcome = await scanLookup('other', '036000291452', 'upc_a');

    expect(outcome.results).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });
});

// Lego set-number routing

describe('lego adapter', () => {
  it('recognizes set numbers', () => {
    expect(looksLikeSetNumber('75192')).toBe(true);
    expect(looksLikeSetNumber('75192-1')).toBe(true);
    expect(looksLikeSetNumber('millennium falcon')).toBe(false);
  });

  it('routes set numbers to exact lookup with the -1 suffix', async () => {
    invoke.mockResolvedValue({ data: { set_num: '75192-1', name: 'Millennium Falcon' }, error: null });

    await legoAdapter.searchByText('75192');

    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'rebrickable', op: 'lookup', params: { set_num: '75192-1' } },
    });
  });
});

// OMDb (movies, proxied)

describe('movies adapter', () => {
  const { moviesAdapter } = require('../adapters/movies');

  it('maps OMDb search hits and drops N/A posters', async () => {
    invoke.mockResolvedValue({
      data: {
        Response: 'True',
        Search: [
          { Title: 'Jurassic Park', Year: '1993', Poster: 'https://m.media-amazon.com/x.jpg' },
          { Title: 'Obscure Film', Year: '2001', Poster: 'N/A' },
        ],
      },
      error: null,
    });

    const results = await moviesAdapter.searchByText('jurassic park');

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: 'Jurassic Park',
      source: 'OMDb',
      imageUrl: 'https://m.media-amazon.com/x.jpg',
      fields: { release_year: 1993 },
    });
    expect(results[1].imageUrl).toBeUndefined();
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'omdb', op: 'search', params: { q: 'jurassic park' } },
    });
  });

  it('treats Response:False as no results', async () => {
    invoke.mockResolvedValue({ data: { Response: 'False', Error: 'Movie not found!' }, error: null });

    await expect(moviesAdapter.searchByText('zzzz')).resolves.toEqual([]);
  });
});

// CardSight (trading cards, proxied)

describe('trading-cards adapter — cardsight', () => {
  const { tradingCardsAdapter } = require('../adapters/trading-cards');

  beforeEach(() => {
    // Keyless direct sources (Scryfall, Pokémon) offline for these tests —
    // a failed source contributes nothing, never throws the whole search.
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
  });

  it('maps cardsight results onto template fields', async () => {
    invoke.mockResolvedValue({
      data: {
        results: [
          {
            type: 'card',
            id: 'uuid-1',
            name: 'Aaron Judge',
            relevance: 9.9,
            year: '2023',
            setName: 'Topps Chrome',
            parallelName: 'Refractor',
            numberedTo: 25,
          },
          { type: 'set', id: 'uuid-2', name: 'Topps Chrome', relevance: 5 },
        ],
      },
      error: null,
    });

    const results = await tradingCardsAdapter.searchByText('aaron judge /25');

    // Set-type results filtered out; only the card survives.
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Aaron Judge');
    expect(results[0].source).toBe('CardSight');
    expect(results[0].fields).toEqual({
      set_name: 'Topps Chrome',
      year: 2023,
      variant: 'Refractor /25',
    });
    // Image sentinel + source id — the save path and enrich pass run on these.
    expect(results[0].imageUrl).toBe('cardsight-image:uuid-1');
    expect(results[0].sourceId).toBe('uuid-1');
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'cardsight', op: 'search', params: { q: 'aaron judge /25' } },
    });
  });

  it('drops an unparseable year and skips the sentinel without an id', async () => {
    invoke.mockResolvedValue({
      data: {
        results: [{ type: 'card', name: 'Mystery Card', year: 'unknown' }],
      },
      error: null,
    });

    const results = await tradingCardsAdapter.searchByText('mystery');

    expect(results).toHaveLength(1);
    expect(results[0].fields.year).toBeUndefined();
    expect(results[0].imageUrl).toBeUndefined();
    expect(results[0].sourceId).toBeUndefined();
  });

  it('still returns results when cardsight is down', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('no key deployed') });

    await expect(tradingCardsAdapter.searchByText('pikachu')).resolves.toEqual([]);
  });
});

// CardSight enrich-on-pick — detail lookup merges card number / game / rarity.

describe('trading-cards adapter — enrich', () => {
  const { tradingCardsAdapter, segmentToGame } = require('../adapters/trading-cards');

  const base = {
    title: 'Aaron Judge',
    fields: { set_name: 'Topps Chrome', year: 2023 },
    source: 'CardSight',
    sourceId: 'uuid-1',
  };

  it('merges detail fields over the search fill', async () => {
    invoke.mockResolvedValue({
      data: {
        card: { cardNumber: '99', segment: 'Baseball', rarity: 'Refractor' },
      },
      error: null,
    });

    const enriched = await tradingCardsAdapter.enrich!(base);

    expect(enriched.fields).toEqual({
      set_name: 'Topps Chrome',
      year: 2023,
      card_number: '99',
      game: 'Sports',
      rarity: 'Refractor',
    });
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'cardsight', op: 'lookup', params: { id: 'uuid-1' } },
    });
  });

  it('reads a flat payload with alternate key names', async () => {
    invoke.mockResolvedValue({
      data: { number: '4/102', segment: 'Pokemon' },
      error: null,
    });

    const enriched = await tradingCardsAdapter.enrich!(base);

    expect(enriched.fields.card_number).toBe('4/102');
    expect(enriched.fields.game).toBe('Pokémon');
  });

  it('returns the original result on lookup failure', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('down') });

    await expect(tradingCardsAdapter.enrich!(base)).resolves.toBe(base);
  });

  it('passes non-CardSight results straight through', async () => {
    const scryfall = { title: 'Black Lotus', fields: {}, source: 'Scryfall' };

    await expect(tradingCardsAdapter.enrich!(scryfall)).resolves.toBe(scryfall);
    expect(invoke).not.toHaveBeenCalled();
  });

  test.each([
    ['Baseball', 'Sports'],
    ['Football', 'Sports'],
    ['Basketball', 'Sports'],
    ['Hockey', 'Sports'],
    ['Soccer', 'Sports'],
    ['Pokemon', 'Pokémon'],
    ['Magic', 'Magic: The Gathering'],
    ['Yu-Gi-Oh', 'Yu-Gi-Oh!'],
    ['Wrestling', 'Other'],
  ])('segmentToGame maps %s → %s', (segment, game) => {
    expect(segmentToGame(segment)).toBe(game);
  });
});

// Scan capability decision

describe('canCameraScan', () => {
  const { canCameraScan } = require('../scan-support');

  it('native always scans', () => {
    expect(canCameraScan('ios', undefined)).toBe(true);
    expect(canCameraScan('android', undefined)).toBe(true);
  });

  it('web scans only with BarcodeDetector', () => {
    expect(canCameraScan('web', { BarcodeDetector: class {} })).toBe(true);
    expect(canCameraScan('web', {})).toBe(false);
    expect(canCameraScan('web', undefined)).toBe(false);
  });
});

// Funko static dataset

describe('funko adapter', () => {
  it('searches the bundled dataset with title-prefix ranking', async () => {
    const results = await funkoAdapter.searchByText('black panther');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain('black panther');
    expect(results[0].source).toBe('Funko dataset');
  });

  it('returns empty on a blank query', async () => {
    await expect(funkoAdapter.searchByText('  ')).resolves.toEqual([]);
  });
});
