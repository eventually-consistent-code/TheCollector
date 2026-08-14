/**
 * Purpose: Art three-tier lookup tests — AIC mapping, Met fallback only
 * when AIC is empty (fan-out capped at 5 objects), Wikidata artist-only
 * tier with its flag, and the no-market-data guarantee. Exercises the
 * helper against a fake fetch, no Deno required.
 * Author(s): John Reed
 */

import { artSearch, type FetchLike } from '../art';

// Fake fetch — routes on a URL substring, records every call so tests can
// assert which tiers fired and how wide the Met fan-out got.
interface FakeRoute {
  match: string;
  body?: unknown;
  status?: number;
}

function fakeFetch(routes: FakeRoute[]): jest.Mock & FetchLike {
  return jest.fn(async (url: string) => {
    const route = routes.find((candidate) => url.includes(candidate.match));
    if (!route) throw new Error(`unexpected fetch: ${url}`);
    const status = route.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => route.body };
  }) as jest.Mock & FetchLike;
}

// Fixtures

const AIC_HIT = {
  data: [
    {
      id: 27992,
      title: 'A Sunday on La Grande Jatte — 1884',
      artist_display: 'Georges Seurat\nFrench, 1859–1891',
      date_display: '1884–86',
      medium_display: 'Oil on canvas',
      dimensions: '207.5 × 308.1 cm',
      image_id: '1adf2696-8489-499b-cad2-821d7fde4b33',
    },
    {
      id: 111628,
      title: 'Nighthawks Study',
      artist_display: 'Edward Hopper\nAmerican, 1882–1967',
      date_display: '1942',
      image_id: null,
    },
  ],
};

const MET_OBJECT = {
  title: 'Wheat Field with Cypresses',
  artistDisplayName: 'Vincent van Gogh',
  objectDate: '1889',
  medium: 'Oil on canvas',
  dimensions: '28 7/8 × 36 3/4 in.',
  primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1567.jpg',
};

// Tier 1 — AIC

describe('artSearch — AIC primary', () => {
  it('maps AIC hits, builds IIIF image urls, and stops at tier one', async () => {
    const fetchFn = fakeFetch([{ match: 'api.artic.edu', body: AIC_HIT }]);

    const payload = await artSearch('grande jatte', fetchFn);

    expect(payload.match).toBe('work');
    expect(payload.artists).toEqual([]);
    expect(payload.works).toHaveLength(2);
    expect(payload.works[0]).toEqual({
      title: 'A Sunday on La Grande Jatte — 1884',
      artist: 'Georges Seurat\nFrench, 1859–1891',
      date: '1884–86',
      medium: 'Oil on canvas',
      dimensions: '207.5 × 308.1 cm',
      imageUrl:
        'https://www.artic.edu/iiif/2/1adf2696-8489-499b-cad2-821d7fde4b33/full/843,/0/default.jpg',
      source: 'aic',
    });
    // No image_id → no invented url.
    expect(payload.works[1].imageUrl).toBeUndefined();

    // One upstream call — Met and Wikidata never fired.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('q=grande+jatte');
    expect(url).toContain('limit=10');
  });

  it('throws on an AIC failure so nothing bad gets cached', async () => {
    const fetchFn = fakeFetch([{ match: 'api.artic.edu', status: 503 }]);

    await expect(artSearch('anything', fetchFn)).rejects.toThrow('aic 503');
  });
});

// Tier 2 — Met fallback

describe('artSearch — Met fallback', () => {
  it('fires only when AIC is empty and caps the object fan-out at 5', async () => {
    const fetchFn = fakeFetch([
      { match: 'api.artic.edu', body: { data: [] } },
      { match: '/v1/search', body: { objectIDs: [11, 22, 33, 44, 55, 66, 77, 88] } },
      { match: '/v1/objects/', body: MET_OBJECT },
    ]);

    const payload = await artSearch('wheat field', fetchFn);

    expect(payload.match).toBe('work');
    expect(payload.works).toHaveLength(5);
    expect(payload.works[0]).toEqual({
      title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh',
      date: '1889',
      medium: 'Oil on canvas',
      dimensions: '28 7/8 × 36 3/4 in.',
      imageUrl: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1567.jpg',
      source: 'met',
    });

    // Eight ids came back; exactly five object fetches went out.
    const calls = fetchFn.mock.calls.map((call) => call[0] as string);
    const objectCalls = calls.filter((url) => url.includes('/v1/objects/'));
    expect(objectCalls).toEqual([
      'https://collectionapi.metmuseum.org/public/collection/v1/objects/11',
      'https://collectionapi.metmuseum.org/public/collection/v1/objects/22',
      'https://collectionapi.metmuseum.org/public/collection/v1/objects/33',
      'https://collectionapi.metmuseum.org/public/collection/v1/objects/44',
      'https://collectionapi.metmuseum.org/public/collection/v1/objects/55',
    ]);
    expect(calls.find((url) => url.includes('/v1/search'))).toContain('hasImages=true');
  });

  it('skips a 404 object id as a routine miss', async () => {
    const fetchFn = fakeFetch([
      { match: 'api.artic.edu', body: { data: [] } },
      { match: '/v1/search', body: { objectIDs: [11, 22] } },
      { match: '/v1/objects/11', status: 404 },
      { match: '/v1/objects/22', body: MET_OBJECT },
    ]);

    const payload = await artSearch('wheat field', fetchFn);

    expect(payload.match).toBe('work');
    expect(payload.works).toHaveLength(1);
  });
});

// Tier 3 — Wikidata artist-only

describe('artSearch — artist-only tier', () => {
  const bothTiersEmpty: FakeRoute[] = [
    { match: 'api.artic.edu', body: { data: [] } },
    { match: '/v1/search', body: { objectIDs: null } },
  ];

  it('flags artist-level results when both work tiers miss', async () => {
    const fetchFn = fakeFetch([
      ...bothTiersEmpty,
      {
        match: 'wikidata.org',
        body: {
          search: [
            { label: 'Hilma af Klint', description: 'Swedish artist (1862–1944)' },
            { label: 'Hilma af Klint Foundation' },
          ],
        },
      },
    ]);

    const payload = await artSearch('hilma af klint', fetchFn);

    // The flag the client branches on — artist prefill, not a work match.
    expect(payload.match).toBe('artist');
    expect(payload.works).toEqual([]);
    expect(payload.artists).toEqual([
      { name: 'Hilma af Klint', description: 'Swedish artist (1862–1944)' },
      { name: 'Hilma af Klint Foundation', description: undefined },
    ]);

    const wikidataUrl = (fetchFn.mock.calls.map((call) => call[0] as string)).find((url) =>
      url.includes('wikidata.org'),
    )!;
    expect(wikidataUrl).toContain('action=wbsearchentities');
    expect(wikidataUrl).toContain('limit=5');
  });

  it('returns match:none when every tier comes up dry', async () => {
    const fetchFn = fakeFetch([...bothTiersEmpty, { match: 'wikidata.org', body: { search: [] } }]);

    const payload = await artSearch('zzzz not a thing', fetchFn);

    expect(payload).toEqual({ match: 'none', works: [], artists: [] });
  });

  it('never emits value data from any tier', async () => {
    const fetchFn = fakeFetch([{ match: 'api.artic.edu', body: AIC_HIT }]);

    const payload = await artSearch('grande jatte', fetchFn);

    // Locked non-goal: no market data, no value fields, from any source.
    expect(JSON.stringify(payload)).not.toContain('insured_value');
    expect(JSON.stringify(payload)).not.toContain('value');
  });
});
