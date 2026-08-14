/**
 * Purpose: General text-query lookup cache — the upc_cache pattern grown
 * up. Keyed on (source, normalized query), stores the raw upstream payload
 * forever, so any query on any source costs at most one upstream call,
 * ever. Dependency-injected so it carries no Deno-isms — index.ts hands in
 * the real service-role client, plain jest hands in a fake.
 * Author(s): John Reed
 */

// Types

// The thin slice of a supabase client this helper actually touches.
export interface LookupCacheDb {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        eq(
          column: string,
          value: string,
        ): { maybeSingle(): Promise<{ data: { payload: unknown } | null }> };
      };
    };
    upsert(row: { source: string; query: string; payload: unknown }): {
      select(): { maybeSingle(): Promise<unknown> };
    };
  };
}

export interface CachedResult {
  payload: unknown;
  cached: boolean;
}

// Constants

const TABLE = 'lookup_cache';

// Helpers

// The one normalizer — lowercase, trimmed, inner whitespace collapsed.
// Every read and write goes through this so "  Dune  Messiah " and
// "dune messiah" are the same row.
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Reads a cached payload, or null on a miss. A read error is just a miss —
// the upstream call still happens, same stance as upc_cache.
export async function cacheGet(
  db: LookupCacheDb,
  source: string,
  query: string,
): Promise<unknown | null> {
  const { data } = await db
    .from(TABLE)
    .select('payload')
    .eq('source', source)
    .eq('query', normalizeQuery(query))
    .maybeSingle();
  return data ? data.payload : null;
}

// Best-effort permanent store; a race on the same key just means two
// identical rows fought over one primary key and the loser is ignored.
export async function cacheSet(
  db: LookupCacheDb,
  source: string,
  query: string,
  payload: unknown,
): Promise<void> {
  await db
    .from(TABLE)
    .upsert({ source, query: normalizeQuery(query), payload })
    .select()
    .maybeSingle();
}

// Write-through wrapper — cache first, fetcher second, store on success.
// The fetcher gets the normalized query and must THROW on upstream failure
// so a bad response is never cached.
export async function cachedSearch(
  db: LookupCacheDb,
  source: string,
  query: string,
  fetcher: (normalized: string) => Promise<unknown>,
): Promise<CachedResult> {
  const normalized = normalizeQuery(query);

  const hit = await cacheGet(db, source, normalized);
  if (hit !== null) return { payload: hit, cached: true };

  const payload = await fetcher(normalized);
  await cacheSet(db, source, normalized, payload);
  return { payload, cached: false };
}
