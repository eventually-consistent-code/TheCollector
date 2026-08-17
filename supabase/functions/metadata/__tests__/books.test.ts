/**
 * Purpose: Books source tests — Open Library mapping (ISBN + text paths),
 * the Google fallback discipline (only on an OL miss AND with a key), the
 * graceful key-unset skip, and the cachedSource wrap. Fake fetch, no Deno.
 * Author(s): John Reed
 */

import { books, booksLookup, booksSearch, type CachedSourceFn } from '../books';

// Fake fetch — routes by URL substring, records every call so tests can
// assert exactly what went upstream (and what never did).
interface Route {
  match: string;
  body?: unknown;
  status?: number;
}

function fakeFetch(routes: Route[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`unrouted fetch: ${url}`);
    const status = route.status ?? 200;
    return {
      ok: status < 400,
      status,
      json: async () => route.body,
    } as Response;
  }) as typeof fetch;

  return { fetchFn, calls };
}

// Fixtures

const OL_DATA = {
  'ISBN:9780441172719': {
    title: 'Dune',
    authors: [{ name: 'Frank Herbert' }],
    publishers: [{ name: 'Ace Books' }],
    publish_date: 'August 1990',
    cover: {
      medium: 'https://covers.openlibrary.org/b/id/240727-M.jpg',
      large: 'https://covers.openlibrary.org/b/id/240727-L.jpg',
    },
  },
};

const OL_SEARCH = {
  docs: [
    {
      title: 'Dune Messiah',
      author_name: ['Frank Herbert'],
      first_publish_year: 1969,
      publisher: ['Putnam'],
      isbn: ['9780441172696'],
      cover_i: 240728,
    },
    // No title — dropped, never mapped.
    { author_name: ['Nobody'] },
  ],
};

const GOOGLE_VOLUMES = {
  items: [
    {
      volumeInfo: {
        title: 'Obscure Chapbook',
        authors: ['A. Nobody', 'B. Somebody'],
        publisher: 'Tiny Press',
        publishedDate: '2011-03-01',
        industryIdentifiers: [
          { type: 'ISBN_10', identifier: '0123456789' },
          { type: 'ISBN_13', identifier: '9780123456786' },
        ],
        imageLinks: { thumbnail: 'https://books.google.com/thumb.jpg' },
      },
    },
  ],
};

// ISBN lookup path

describe('booksLookup — Open Library', () => {
  it('maps the bibkeys data payload onto the normalized hit shape', async () => {
    const { fetchFn } = fakeFetch([{ match: 'openlibrary.org/api/books', body: OL_DATA }]);

    const { results } = await booksLookup('9780441172719', { fetchFn });

    expect(results).toEqual([
      {
        title: 'Dune',
        authors: ['Frank Herbert'],
        publisher: 'Ace Books',
        publish_date: 'August 1990',
        isbn: '9780441172719',
        cover_url: 'https://covers.openlibrary.org/b/id/240727-L.jpg',
        source: 'Open Library',
      },
    ]);
  });

  it('sends the identifying User-Agent to Open Library', async () => {
    const { fetchFn, calls } = fakeFetch([{ match: 'openlibrary.org/api/books', body: OL_DATA }]);

    await booksLookup('9780441172719', { fetchFn });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('bibkeys=ISBN%3A9780441172719');
    expect(calls[0].url).toContain('jscmd=data');
    expect((calls[0].init?.headers as Record<string, string>)['User-Agent']).toBe(
      'TheCollector/1.0 (jsreed@pm.me)',
    );
  });

  it('throws a HUMAN message on an upstream error (still throws — nothing bad caches)', async () => {
    const { fetchFn } = fakeFetch([{ match: 'openlibrary.org/api/books', status: 503 }]);

    await expect(booksLookup('9780441172719', { fetchFn })).rejects.toThrow(
      'temporarily unavailable'
    );
  });

  it('fails over to Google when Open Library errors and a key is present', async () => {
    const { fetchFn, calls } = fakeFetch([
      { match: 'openlibrary.org/api/books', status: 503 },
      { match: 'googleapis.com/books', body: GOOGLE_VOLUMES },
    ]);

    const out = await booksLookup('9780441172719', { fetchFn, googleKey: 'k' });

    expect(out.results.length).toBeGreaterThan(0);
    expect(out.results[0].source).toBe('Google Books');
    expect(calls.some((c) => c.url.includes('googleapis.com'))).toBe(true);
  });
});

// Text search path

describe('booksSearch — Open Library', () => {
  it('maps search docs and builds the CoverID cover URL', async () => {
    const { fetchFn, calls } = fakeFetch([{ match: 'openlibrary.org/search.json', body: OL_SEARCH }]);

    const { results } = await booksSearch('dune messiah', { fetchFn });

    // Titleless doc dropped.
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'Dune Messiah',
      authors: ['Frank Herbert'],
      publisher: 'Putnam',
      publish_date: '1969',
      isbn: '9780441172696',
      // CoverID form, NOT the rate-limited ISBN-keyed form.
      cover_url: 'https://covers.openlibrary.org/b/id/240728-L.jpg',
      source: 'Open Library',
    });
    expect(calls[0].url).toContain(
      'fields=title%2Cauthor_name%2Cfirst_publish_year%2Cpublisher%2Cisbn%2Ccover_i',
    );
    expect(calls[0].url).toContain('limit=10');
  });
});

// Google fallback discipline

describe('google books fallback', () => {
  it('is used only when Open Library is empty AND a key is present', async () => {
    const { fetchFn, calls } = fakeFetch([
      { match: 'openlibrary.org/api/books', body: {} },
      { match: 'googleapis.com/books', body: GOOGLE_VOLUMES },
    ]);

    const { results } = await booksLookup('9780123456786', { fetchFn, googleKey: 'g-key' });

    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain('q=isbn%3A9780123456786');
    expect(calls[1].url).toContain('key=g-key');
    expect(results).toEqual([
      {
        title: 'Obscure Chapbook',
        authors: ['A. Nobody', 'B. Somebody'],
        publisher: 'Tiny Press',
        publish_date: '2011-03-01',
        isbn: '9780123456786', // ISBN_13 preferred over ISBN_10
        cover_url: 'https://books.google.com/thumb.jpg',
        source: 'Google Books',
      },
    ]);
  });

  it('never fires when Open Library already has hits', async () => {
    const { fetchFn, calls } = fakeFetch([
      { match: 'openlibrary.org/api/books', body: OL_DATA },
      { match: 'googleapis.com/books', body: GOOGLE_VOLUMES },
    ]);

    const { results } = await booksLookup('9780441172719', { fetchFn, googleKey: 'g-key' });

    expect(calls).toHaveLength(1);
    expect(results[0].source).toBe('Open Library');
  });

  it('key unset → skipped gracefully, empty results, no error', async () => {
    const { fetchFn, calls } = fakeFetch([{ match: 'openlibrary.org/api/books', body: {} }]);

    const { results } = await booksLookup('9780441172719', { fetchFn });

    expect(results).toEqual([]);
    expect(calls).toHaveLength(1); // Open Library only — Google never tried.
  });

  it('rides the text path too', async () => {
    const { fetchFn, calls } = fakeFetch([
      { match: 'openlibrary.org/search.json', body: { docs: [] } },
      { match: 'googleapis.com/books', body: GOOGLE_VOLUMES },
    ]);

    const { results } = await booksSearch('obscure chapbook', { fetchFn, googleKey: 'g-key' });

    expect(calls[1].url).toContain('q=obscure+chapbook');
    expect(results).toHaveLength(1);
  });
});

// cachedSource wrap

describe('books router', () => {
  // Records the (source, query) key and runs the fetcher, like the real
  // cachedSource does on a cache miss.
  function fakeCached() {
    const keys: Array<{ source: string; query: string }> = [];
    const cached: CachedSourceFn = async (source, query, fetcher) => {
      keys.push({ source, query });
      const payload = await fetcher(query);
      return { payload } as unknown as Response;
    };
    return { cached, keys };
  }

  it('wraps the ISBN path in cachedSource with a stable isbn key', async () => {
    const { fetchFn } = fakeFetch([{ match: 'openlibrary.org/api/books', body: OL_DATA }]);
    const { cached, keys } = fakeCached();

    await books('lookup', { isbn: '978-0-441-17271-9' }, cached, { fetchFn });

    // Hyphens collapse so every spelling of one ISBN is one cache row.
    expect(keys).toEqual([{ source: 'books', query: 'isbn:9780441172719' }]);
  });

  it('wraps the text path in cachedSource keyed on the query', async () => {
    const { fetchFn } = fakeFetch([{ match: 'openlibrary.org/search.json', body: OL_SEARCH }]);
    const { cached, keys } = fakeCached();

    await books('search', { q: 'dune messiah' }, cached, { fetchFn });

    expect(keys).toEqual([{ source: 'books', query: 'dune messiah' }]);
  });
});
