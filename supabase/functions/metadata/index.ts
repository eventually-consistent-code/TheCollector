/**
 * Purpose: Metadata proxy — one function, six sources. Holds every API
 * secret (Discogs, Twitch/IGDB, TMDB, Comic Vine, Rebrickable) so nothing
 * keyed ships in the client bundle, and fronts the upc_cache table so a
 * barcode is resolved upstream at most once, ever.
 * Author(s): John Reed
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { artSearch } from './art.ts';
import { books } from './books.ts';
import { cigars } from './cigars.ts';
import { cachedSearch } from './lookup_cache.ts';
import { timepiecesSearch } from './thewatchapi.ts';

// Constants

const USER_AGENT = 'TheCollector/0.1 +https://github.com/eventually-consistent-code/TheCollector';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Variables

// IGDB app token, cached across invocations of a warm instance.
let igdbToken: string | null = null;

// Helpers

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing secret: ${name}`);
  return value;
}

// Service-role client — bypasses RLS; the only path to the cache tables.
function adminClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
}

// Write-through text-query cache: check lookup_cache, hit upstream at most
// once, store forever. Upcoming adapters (books, art, timepieces, cigars)
// wrap their upstream fetch in this instead of calling out directly — the
// fetcher must throw on failure so a bad response is never cached.
async function cachedSource(
  source: string,
  query: string,
  fetcher: (normalized: string) => Promise<unknown>,
): Promise<Response> {
  const { payload } = await cachedSearch(adminClient(), source, query, fetcher);
  return json(payload);
}

// Sources

async function discogs(op: string, params: Record<string, string>): Promise<Response> {
  const url = new URL('https://api.discogs.com/database/search');
  if (op === 'lookup') {
    url.searchParams.set('barcode', params.upc ?? params.barcode ?? '');
  } else {
    url.searchParams.set('q', params.q ?? '');
  }
  url.searchParams.set('type', 'release');
  url.searchParams.set('per_page', '15');

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Discogs key=${env('DISCOGS_KEY')}, secret=${env('DISCOGS_SECRET')}`,
    },
  });
  if (!response.ok) return fail(`discogs ${response.status}`, response.status);
  return json(await response.json());
}

// Client-credentials token, refreshed once on a 401 retry.
async function igdbAuth(): Promise<string> {
  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', env('TWITCH_CLIENT_ID'));
  url.searchParams.set('client_secret', env('TWITCH_CLIENT_SECRET'));
  url.searchParams.set('grant_type', 'client_credentials');

  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) throw new Error(`twitch auth ${response.status}`);
  const body = await response.json();
  return body.access_token as string;
}

async function igdb(params: Record<string, string>, retried = false): Promise<Response> {
  if (!igdbToken) igdbToken = await igdbAuth();

  // Escape embedded quotes — IGDB's query language is string-delimited.
  const search = (params.q ?? '').replaceAll('"', '\\"');
  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': env('TWITCH_CLIENT_ID'),
      Authorization: `Bearer ${igdbToken}`,
    },
    body: `search "${search}"; fields name,first_release_date,platforms.name,involved_companies.company.name,involved_companies.publisher,cover.url; limit 15;`,
  });

  if (response.status === 401 && !retried) {
    igdbToken = null;
    return igdb(params, true);
  }
  if (!response.ok) return fail(`igdb ${response.status}`, response.status);
  return json(await response.json());
}

// CardSight — cross-TCG + sports card catalog (12M+ cards), fuzzy search.
async function cardsight(params: Record<string, string>): Promise<Response> {
  const url = new URL('https://api.cardsight.ai/v1/catalog/search');
  url.searchParams.set('q', params.q ?? '');
  url.searchParams.set('type', 'card');
  url.searchParams.set('take', '15');

  const response = await fetch(url, {
    headers: { 'X-API-Key': env('CARDSIGHT_API_KEY'), 'User-Agent': USER_AGENT },
  });
  if (!response.ok) return fail(`cardsight ${response.status}`, response.status);
  return json(await response.json());
}

// OMDb over TMDB: TMDB's commercial license runs ~$150/mo; OMDb's free tier
// (1,000/day) and cheap patron tiers fit a commercial app.
async function omdb(params: Record<string, string>): Promise<Response> {
  const url = new URL('https://www.omdbapi.com/');
  url.searchParams.set('apikey', env('OMDB_API_KEY'));
  url.searchParams.set('s', params.q ?? '');
  url.searchParams.set('type', 'movie');

  const response = await fetch(url);
  if (!response.ok) return fail(`omdb ${response.status}`, response.status);
  return json(await response.json());
}

async function comicvine(params: Record<string, string>): Promise<Response> {
  const url = new URL('https://comicvine.gamespot.com/api/search/');
  url.searchParams.set('api_key', env('COMICVINE_API_KEY'));
  url.searchParams.set('format', 'json');
  url.searchParams.set('query', params.q ?? '');
  url.searchParams.set('resources', 'issue');
  url.searchParams.set('limit', '10');
  url.searchParams.set('field_list', 'name,issue_number,cover_date,volume,image');

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) return fail(`comicvine ${response.status}`, response.status);
  return json(await response.json());
}

async function rebrickable(op: string, params: Record<string, string>): Promise<Response> {
  const base = 'https://rebrickable.com/api/v3/lego/sets/';
  const url =
    op === 'lookup'
      ? new URL(`${base}${encodeURIComponent(params.set_num ?? '')}/`)
      : new URL(base);
  if (op !== 'lookup') {
    url.searchParams.set('search', params.q ?? '');
    url.searchParams.set('page_size', '15');
  }

  const response = await fetch(url, {
    headers: { Authorization: `key ${env('REBRICKABLE_API_KEY')}` },
  });
  // Unknown set number is a routine miss, not an error.
  if (op === 'lookup' && response.status === 404) return json(null);
  if (!response.ok) return fail(`rebrickable ${response.status}`, response.status);
  return json(await response.json());
}

// UPC bridge: cache first, UPCitemdb trial second. Service role bypasses
// RLS — clients cannot reach upc_cache any other way.
async function upcBridge(params: Record<string, string>): Promise<Response> {
  const upc = params.upc ?? '';
  if (!/^\d{8,14}$/.test(upc)) return fail('bad upc', 400);

  const admin = adminClient();

  const { data: cached } = await admin
    .from('upc_cache')
    .select('title, brand')
    .eq('upc', upc)
    .maybeSingle();
  if (cached) return json({ title: cached.title, brand: cached.brand ?? undefined, cached: true });

  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
  if (response.status === 429) return fail('upc bridge rate-limited — try later', 429);
  if (!response.ok) return fail(`upc bridge ${response.status}`, response.status);

  const body = await response.json();
  const item = body.items?.[0];
  if (!item?.title) return fail('unknown barcode', 404);

  // Best-effort insert; a race on the same UPC just means two identical rows
  // fought over one primary key and the loser is ignored.
  await admin
    .from('upc_cache')
    .upsert({ upc, title: item.title, brand: item.brand ?? null, payload: item })
    .select()
    .maybeSingle();

  return json({ title: item.title, brand: item.brand ?? undefined, cached: false });
}

// Main

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let body: { source?: string; op?: string; params?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return fail('bad request body', 400);
  }

  const { source, op = 'search', params = {} } = body;

  try {
    switch (source) {
      case 'discogs':
        return await discogs(op, params);
      case 'igdb':
        return await igdb(params);
      case 'cardsight':
        return await cardsight(params);
      case 'omdb':
        return await omdb(params);
      case 'comicvine':
        return await comicvine(params);
      case 'rebrickable':
        return await rebrickable(op, params);
      case 'art':
        return await cachedSource('art', params.q ?? '', (normalized) =>
          artSearch(normalized, fetch),
        );
      case 'books':
        return await books(op, params, cachedSource, {
          googleKey: Deno.env.get('GOOGLE_BOOKS_KEY') ?? undefined,
        });
      case 'upc':
        return await upcBridge(params);
      case 'timepieces':
        // thewatchapi behind the lookup cache; barcode queries hop through
        // the existing UPC bridge for a title first (see thewatchapi.ts).
        return json(
          await timepiecesSearch(params.q ?? params.upc ?? '', {
            db: adminClient(),
            apiToken: Deno.env.get('THEWATCHAPI_KEY'),
            fetchFn: fetch,
            resolveUpc: async (upc) => {
              const hit = await upcBridge({ upc });
              return hit.ok ? ((await hit.json()).title ?? null) : null;
            },
          }),
        );
      case 'cigars': {
        const result = await cigars(op, params);
        return json(result.body, result.status);
      }
      default:
        return fail(`unknown source: ${source}`, 400);
    }
  } catch (error) {
    console.error('metadata error:', error);
    return fail(error instanceof Error ? error.message : 'lookup failed', 500);
  }
});
