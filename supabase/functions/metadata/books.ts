/**
 * Purpose: Books source — Open Library first (keyless, so be polite),
 * Google Books fallback only when Open Library comes up empty AND a key is
 * deployed. Both upstreams are flattened into ONE hit shape here so the
 * lookup cache and the client adapter never see two formats. Dependency-
 * injected like lookup_cache — index.ts hands in real fetch + env, plain
 * jest hands in fakes.
 * Author(s): John Reed
 */

// Types

// The one normalized hit shape — everything downstream reads this.
export interface BookHit {
  title: string;
  authors: string[];
  publisher?: string;
  publish_date?: string;
  isbn?: string;
  cover_url?: string;
  // Which upstream produced the hit, for attribution in the picker UI.
  source: 'Open Library' | 'Google Books';
}

export interface BooksOptions {
  // Injected for tests; defaults to the platform fetch.
  fetchFn?: typeof fetch;
  // Google Books key — unset means the fallback is skipped, never an error.
  googleKey?: string;
}

// The cachedSource wrapper from index.ts, injected so this file stays
// Deno-free and jest-runnable.
export type CachedSourceFn = (
  source: string,
  query: string,
  fetcher: (normalized: string) => Promise<unknown>,
) => Promise<Response>;

// Open Library payload slices we actually read.
interface OlDataEntry {
  title?: string;
  authors?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  publish_date?: string;
  cover?: { small?: string; medium?: string; large?: string };
}

interface OlSearchDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  isbn?: string[];
  cover_i?: number;
}

// Google Books volume slice.
interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string };
  };
}

// Constants

// Open Library asks for an identifying User-Agent; anonymous callers get
// throttled first when they shed load.
const OL_USER_AGENT = 'TheCollector/1.0 (jsreed@pm.me)';

// Upstreams

async function openLibraryLookup(isbn: string, fetchFn: typeof fetch): Promise<BookHit[]> {
  const url = new URL('https://openlibrary.org/api/books');
  url.searchParams.set('bibkeys', `ISBN:${isbn}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('jscmd', 'data');

  const response = await fetchFn(url.toString(), {
    headers: { 'User-Agent': OL_USER_AGENT },
  });
  // Throw, never return — a bad response must not reach the cache.
  if (!response.ok) throw new Error(`openlibrary ${response.status}`);

  const body = (await response.json()) as Record<string, OlDataEntry | undefined>;
  const entry = body[`ISBN:${isbn}`];
  if (!entry?.title) return [];

  return [
    {
      title: entry.title,
      authors: (entry.authors ?? []).map((a) => a.name ?? '').filter(Boolean),
      publisher: entry.publishers?.[0]?.name,
      publish_date: entry.publish_date,
      isbn,
      cover_url: entry.cover?.large ?? entry.cover?.medium,
      source: 'Open Library',
    },
  ];
}

async function openLibrarySearch(q: string, fetchFn: typeof fetch): Promise<BookHit[]> {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'title,author_name,first_publish_year,publisher,isbn,cover_i');
  url.searchParams.set('limit', '10');

  const response = await fetchFn(url.toString(), {
    headers: { 'User-Agent': OL_USER_AGENT },
  });
  if (!response.ok) throw new Error(`openlibrary ${response.status}`);

  const body = (await response.json()) as { docs?: OlSearchDoc[] };
  return (body.docs ?? [])
    .filter((doc): doc is OlSearchDoc & { title: string } => !!doc.title)
    .map((doc) => ({
      title: doc.title,
      authors: doc.author_name ?? [],
      publisher: doc.publisher?.[0],
      publish_date: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
      isbn: doc.isbn?.[0],
      // CoverID form ON PURPOSE — the ISBN-keyed covers endpoint is
      // rate-limited; /b/id/ is not.
      cover_url: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined,
      source: 'Open Library' as const,
    }));
}

async function googleBooks(query: string, key: string, fetchFn: typeof fetch): Promise<BookHit[]> {
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', query);
  url.searchParams.set('key', key);

  const response = await fetchFn(url.toString());
  if (!response.ok) throw new Error(`google books ${response.status}`);

  const body = (await response.json()) as { items?: GoogleVolume[] };
  return (body.items ?? [])
    .map((volume) => volume.volumeInfo)
    .filter((info): info is NonNullable<GoogleVolume['volumeInfo']> & { title: string } => !!info?.title)
    .map((info) => {
      const ids = info.industryIdentifiers ?? [];
      const isbn =
        ids.find((id) => id.type === 'ISBN_13')?.identifier ??
        ids.find((id) => id.type === 'ISBN_10')?.identifier;

      return {
        title: info.title,
        authors: info.authors ?? [],
        publisher: info.publisher,
        publish_date: info.publishedDate,
        isbn,
        cover_url: info.imageLinks?.thumbnail,
        source: 'Google Books' as const,
      };
    });
}

// Main

// ISBN path: Open Library's book API, Google fallback on a clean miss.
export async function booksLookup(
  isbn: string,
  opts: BooksOptions = {},
): Promise<{ results: BookHit[] }> {
  const fetchFn = opts.fetchFn ?? fetch;

  const hits = await openLibraryLookup(isbn, fetchFn);
  if (hits.length > 0) return { results: hits };

  // No key deployed → the fallback simply does not exist. Not an error.
  if (!opts.googleKey) return { results: [] };
  return { results: await googleBooks(`isbn:${isbn}`, opts.googleKey, fetchFn) };
}

// Text path: Open Library search, same fallback rules.
export async function booksSearch(
  q: string,
  opts: BooksOptions = {},
): Promise<{ results: BookHit[] }> {
  const fetchFn = opts.fetchFn ?? fetch;

  const hits = await openLibrarySearch(q, fetchFn);
  if (hits.length > 0) return { results: hits };

  if (!opts.googleKey) return { results: [] };
  return { results: await googleBooks(q, opts.googleKey, fetchFn) };
}

// Route + cache — every upstream fetch rides cachedSource, so any ISBN or
// text query costs at most one upstream round trip, ever.
export async function books(
  op: string,
  params: Record<string, string>,
  cached: CachedSourceFn,
  opts: BooksOptions = {},
): Promise<Response> {
  if (op === 'lookup') {
    // Hyphenated ISBNs collapse to bare digits so cache keys line up.
    const isbn = (params.isbn ?? params.barcode ?? '').replace(/[^0-9Xx]/g, '');
    return cached('books', `isbn:${isbn}`, () => booksLookup(isbn, opts));
  }
  return cached('books', params.q ?? '', (normalized) => booksSearch(normalized, opts));
}
