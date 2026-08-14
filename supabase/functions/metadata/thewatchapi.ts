/**
 * Purpose: Timepieces source — thewatchapi model search behind the shared
 * lookup cache, with a UPC→title hop through the existing bridge for
 * barcode queries. The free tier allows 25 requests/day, so every upstream
 * call rides the permanent cache and quota errors degrade to a friendly
 * in-band payload instead of a 500. Dependency-injected like lookup_cache —
 * no Deno-isms, plain jest runs it.
 * Author(s): John Reed
 */

import { cachedSearch, type LookupCacheDb } from './lookup_cache.ts';

// Types

// Everything with a side effect arrives injected — index.ts hands in the
// real service-role client / fetch / UPC bridge, jest hands in fakes.
export interface TimepiecesDeps {
  db: LookupCacheDb;
  // undefined when THEWATCHAPI_KEY is not configured — degrade, don't crash.
  apiToken: string | undefined;
  fetchFn: typeof fetch;
  // The existing UPC bridge (upc_cache first, UPCitemdb second) — resolves
  // a barcode to a product title, or null when nobody knows it.
  resolveUpc: (upc: string) => Promise<string | null>;
}

// Constants

const SOURCE = 'timepieces';

// Per the docs, /v1/reference/search returns bare reference numbers only;
// /v1/model/search returns the full spec sheet. Live-tested reality of the
// free tier: broad multi-attribute searches 400 with `too_many_results`
// (plan caps results at 3), while a reference-number-scoped search returns
// exactly the record we want — so reference-looking queries search the
// reference_number attribute alone, and free-text falls back to the model
// attribute with the too-many case degraded to an in-band "refine" message.
const SEARCH_URL = 'https://api.thewatchapi.com/v1/model/search';

export const LIMIT_MESSAGE = 'daily lookup limit reached — try tomorrow or add manually';
export const UNAVAILABLE_MESSAGE = 'timepieces lookup is not configured — add details manually';
export const REFINE_MESSAGE =
  'too many matches — add the reference number (case back or papers) for an exact match';

// Retail noise a UPC product title drags along (colors, sizes, gender cuts,
// the word "watch" itself) that only hurts a watch-catalog search.
const NOISE_WORDS = new Set([
  'black', 'white', 'blue', 'green', 'red', 'brown', 'grey', 'gray', 'silver',
  'gold', 'rose', 'yellow', 'orange', 'pink', 'purple', 'champagne', 'ivory',
  'tan', 'beige', 'navy',
  'small', 'medium', 'large', 'mini', 'xs', 'xl', 'xxl',
  'mens', "men's", 'men', 'womens', "women's", 'women', 'ladies', "lady's",
  'unisex', 'boys', 'girls', 'kids',
  'watch', 'watches', 'wristwatch',
]);

// Thrown (never returned) on quota/throttle so cachedSearch can never
// store a limit response as if it were real data.
class UsageLimitError extends Error {}

// Thrown when the free tier refuses a broad query (`too_many_results`) —
// same rule: degrade in-band, never cache.
class TooManyResultsError extends Error {}

// Helpers

// A UPC/EAN typed into the search box: all digits, 12–13 long.
export function isBarcodeQuery(query: string): boolean {
  return /^\d{12,13}$/.test(query.trim());
}

// Drops the obvious retail noise words; falls back to the original title
// when stripping would leave nothing to search on.
export function stripNoise(title: string): string {
  const kept = title
    .split(/\s+/)
    .filter((word) => !NOISE_WORDS.has(word.toLowerCase().replace(/[^a-z0-9'-]/g, '')));
  const cleaned = kept.join(' ').trim();
  return cleaned || title.trim();
}

// Picks a reference-number-looking token out of a query: ≥5 chars with ≥4
// digits (dots/slashes/dashes allowed) — matches "126234" and
// "310.30.42.50.01.001" while leaving calibres ("3861") and years alone.
export function extractReference(query: string): string | null {
  for (const token of query.split(/\s+/)) {
    const cleaned = token.replace(/[^A-Za-z0-9./-]/g, '');
    const digits = (cleaned.match(/\d/g) ?? []).length;
    if (cleaned.length >= 5 && digits >= 4) return cleaned;
  }
  return null;
}

// The one upstream call — throws on anything that should not be cached.
async function fetchWatches(deps: TimepiecesDeps, search: string): Promise<unknown> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('api_token', deps.apiToken ?? '');
  // Reference-scoped when the query carries one (free tier returns the full
  // record for those); model-scoped free text otherwise.
  const reference = extractReference(search);
  url.searchParams.set('search', reference ?? search);
  url.searchParams.set('search_attributes', reference ? 'reference_number' : 'model');

  const response = await deps.fetchFn(url.toString());
  // 402 = plan quota spent (25/day on the free tier), 429 = per-minute
  // throttle — either way the human answer is the same.
  if (response.status === 402 || response.status === 429) {
    throw new UsageLimitError(LIMIT_MESSAGE);
  }
  if (response.status === 400) {
    // Free tier caps results at 3; broad queries bounce with
    // too_many_results — that's guidance for the human, not an error.
    const body = await response.json().catch(() => null);
    const code = (body as { error?: { code?: string } } | null)?.error?.code;
    if (code === 'too_many_results') throw new TooManyResultsError(REFINE_MESSAGE);
    throw new Error(`thewatchapi 400${code ? ` (${code})` : ''}`);
  }
  if (!response.ok) throw new Error(`thewatchapi ${response.status}`);
  return await response.json();
}

// Main

// One entry point: text or barcode in, a cache-backed payload out. Degraded
// modes (no key, quota spent, unknown barcode) come back in-band as an
// empty-data payload with a message — never a crash, never cached.
export async function timepiecesSearch(query: string, deps: TimepiecesDeps): Promise<unknown> {
  if (!deps.apiToken) {
    return { data: [], unavailable: true, message: UNAVAILABLE_MESSAGE };
  }

  let text = query;
  if (isBarcodeQuery(query)) {
    const title = await deps.resolveUpc(query.trim());
    if (!title) {
      return { data: [], message: 'barcode not recognized — try a text search or add manually' };
    }
    text = stripNoise(title);
  }
  if (!text.trim()) return { data: [] };

  try {
    const { payload } = await cachedSearch(deps.db, SOURCE, text, (normalized) =>
      fetchWatches(deps, normalized),
    );
    return payload;
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return { data: [], limited: true, message: LIMIT_MESSAGE };
    }
    if (error instanceof TooManyResultsError) {
      return { data: [], refine: true, message: REFINE_MESSAGE };
    }
    throw error;
  }
}
