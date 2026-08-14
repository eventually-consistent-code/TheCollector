/**
 * Purpose: Art lookup, three tiers — Art Institute of Chicago first
 * (keyless, great images), Met Museum when AIC misses, and a Wikidata
 * artist search when both work-level tiers miss (private pieces usually
 * do) so the form still starts with the artist. Value fields are NEVER
 * populated — no market data, by design. Dependency-injected fetch so
 * plain jest can exercise every tier, no Deno required.
 * Author(s): John Reed
 */

// Types

// The slice of fetch this helper actually touches — keeps the file free of
// Deno/DOM types so index.ts hands in the real fetch, jest hands in a fake.
export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface ArtWork {
  title: string;
  artist?: string;
  date?: string;
  medium?: string;
  dimensions?: string;
  imageUrl?: string;
  source: 'aic' | 'met';
}

export interface ArtArtist {
  name: string;
  description?: string;
}

// `match` is how the client tells a work-level hit from an artist-only one:
// 'work' when a museum tier answered, 'artist' when only Wikidata knew the
// name (map to the artist field, leave work fields manual), 'none' when
// nobody did.
export interface ArtSearchPayload {
  match: 'work' | 'artist' | 'none';
  works: ArtWork[];
  artists: ArtArtist[];
}

interface AicArtwork {
  id?: number;
  title?: string;
  artist_display?: string;
  date_display?: string;
  medium_display?: string;
  dimensions?: string;
  image_id?: string | null;
}

interface MetObject {
  title?: string;
  artistDisplayName?: string;
  objectDate?: string;
  medium?: string;
  dimensions?: string;
  primaryImageSmall?: string;
}

interface WikidataEntity {
  label?: string;
  description?: string;
}

// Constants

const AIC_SEARCH_URL = 'https://api.artic.edu/api/v1/artworks/search';
const AIC_FIELDS = 'id,title,artist_display,date_display,medium_display,dimensions,image_id';
const MET_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';

// Met search returns bare objectIDs (often thousands); each one costs a
// follow-up fetch, so the fan-out is hard-capped.
const MET_OBJECT_CAP = 5;

// Tier 1 — Art Institute of Chicago (keyless)

async function aicSearch(query: string, fetchFn: FetchLike): Promise<ArtWork[]> {
  const url = new URL(AIC_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('fields', AIC_FIELDS);
  url.searchParams.set('limit', '10');

  const response = await fetchFn(url.toString());
  if (!response.ok) throw new Error(`aic ${response.status}`);
  const body = (await response.json()) as { data?: AicArtwork[] };

  return (body.data ?? [])
    .filter((art) => art.title)
    .map((art) => ({
      title: art.title as string,
      artist: art.artist_display || undefined,
      date: art.date_display || undefined,
      medium: art.medium_display || undefined,
      dimensions: art.dimensions || undefined,
      imageUrl: art.image_id
        ? `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg`
        : undefined,
      source: 'aic' as const,
    }));
}

// Tier 2 — Met Museum (keyless)

async function metObject(id: number, fetchFn: FetchLike): Promise<ArtWork | null> {
  const response = await fetchFn(`${MET_BASE_URL}/objects/${id}`);
  // A search id whose object is gone is a routine miss, not an error.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`met object ${response.status}`);
  const object = (await response.json()) as MetObject;
  if (!object.title) return null;

  return {
    title: object.title,
    artist: object.artistDisplayName || undefined,
    date: object.objectDate || undefined,
    medium: object.medium || undefined,
    dimensions: object.dimensions || undefined,
    imageUrl: object.primaryImageSmall || undefined,
    source: 'met' as const,
  };
}

async function metSearch(query: string, fetchFn: FetchLike): Promise<ArtWork[]> {
  const url = new URL(`${MET_BASE_URL}/search`);
  url.searchParams.set('hasImages', 'true');
  url.searchParams.set('q', query);

  const response = await fetchFn(url.toString());
  if (!response.ok) throw new Error(`met ${response.status}`);
  const body = (await response.json()) as { objectIDs?: number[] | null };

  const ids = (body.objectIDs ?? []).slice(0, MET_OBJECT_CAP);
  const objects = await Promise.all(ids.map((id) => metObject(id, fetchFn)));
  return objects.filter((work): work is ArtWork => work !== null);
}

// Tier 3 — Wikidata artist prefill (keyless)

async function wikidataArtists(query: string, fetchFn: FetchLike): Promise<ArtArtist[]> {
  const url = new URL(WIKIDATA_API_URL);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', query);
  url.searchParams.set('language', 'en');
  url.searchParams.set('type', 'item');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');

  const response = await fetchFn(url.toString());
  if (!response.ok) throw new Error(`wikidata ${response.status}`);
  const body = (await response.json()) as { search?: WikidataEntity[] };

  return (body.search ?? [])
    .filter((entity) => entity.label)
    .map((entity) => ({
      name: entity.label as string,
      description: entity.description || undefined,
    }));
}

// Main

// Three tiers, first answer wins: AIC → Met → Wikidata artist-only. Every
// tier throws on upstream failure so a bad response is never cached by the
// cachedSource wrapper in index.ts.
export async function artSearch(query: string, fetchFn: FetchLike): Promise<ArtSearchPayload> {
  const aicWorks = await aicSearch(query, fetchFn);
  if (aicWorks.length > 0) return { match: 'work', works: aicWorks, artists: [] };

  const metWorks = await metSearch(query, fetchFn);
  if (metWorks.length > 0) return { match: 'work', works: metWorks, artists: [] };

  const artists = await wikidataArtists(query, fetchFn);
  if (artists.length > 0) return { match: 'artist', works: [], artists };

  return { match: 'none', works: [], artists: [] };
}
