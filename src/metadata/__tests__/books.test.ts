/**
 * Purpose: Books adapter tests — hit→field mapping, the ISBN (978/979)
 * scan routing vs the bridge fallback, and the locked rule that
 * edition_printing is never auto-filled.
 * Author(s): John Reed
 */

// The real client throws without env vars and drags in RN internals; the
// metadata layer only touches functions.invoke.
jest.mock('@/auth/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '@/auth/client';
import { TEMPLATES } from '@/templates';

import { booksAdapter, isIsbnBarcode } from '../adapters/books';
import { scanLookup } from '../index';

const invoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  invoke.mockReset();
});

// Fixture — the normalized hit shape the edge fn's books source returns.
const DUNE_HIT = {
  title: 'Dune',
  authors: ['Frank Herbert'],
  publisher: 'Ace Books',
  publish_date: 'August 1990',
  isbn: '9780441172719',
  cover_url: 'https://covers.openlibrary.org/b/id/240727-L.jpg',
  source: 'Open Library',
};

// ISBN routing

describe('isIsbnBarcode', () => {
  it('accepts Bookland EAN-13s (978/979)', () => {
    expect(isIsbnBarcode('9780441172719')).toBe(true);
    expect(isIsbnBarcode('9791234567896')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isIsbnBarcode('4006381333931')).toBe(false); // ordinary EAN-13
    expect(isIsbnBarcode('036000291452')).toBe(false); // UPC-A
    expect(isIsbnBarcode('978044117271')).toBe(false); // 12 digits — too short
    expect(isIsbnBarcode('dune')).toBe(false);
  });
});

// Field mapping

describe('books adapter', () => {
  it('maps a hit onto template fields', async () => {
    invoke.mockResolvedValue({ data: { results: [DUNE_HIT] }, error: null });

    const results = await booksAdapter.searchByText('dune');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: 'Dune',
      subtitle: 'Frank Herbert',
      imageUrl: 'https://covers.openlibrary.org/b/id/240727-L.jpg',
      source: 'Open Library',
      fields: {
        author: 'Frank Herbert',
        publisher: 'Ace Books',
        publish_date: 'August 1990',
        isbn: '9780441172719',
      },
    });
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'books', op: 'search', params: { q: 'dune' } },
    });
  });

  it('joins multiple authors and carries the Google Books attribution', async () => {
    invoke.mockResolvedValue({
      data: {
        results: [
          { title: 'Good Omens', authors: ['Terry Pratchett', 'Neil Gaiman'], source: 'Google Books' },
        ],
      },
      error: null,
    });

    const results = await booksAdapter.searchByText('good omens');

    expect(results[0].fields.author).toBe('Terry Pratchett, Neil Gaiman');
    expect(results[0].source).toBe('Google Books');
  });

  it('NEVER auto-fills edition_printing — collector-asserted only', async () => {
    // Even a payload that tries to smuggle an edition in maps to nothing.
    invoke.mockResolvedValue({
      data: { results: [{ ...DUNE_HIT, edition: '1st edition', edition_printing: '1st/1st' }] },
      error: null,
    });

    const results = await booksAdapter.searchByText('dune');

    expect(results[0].fields).not.toHaveProperty('edition_printing');
    expect(results[0].fields).not.toHaveProperty('edition');
  });

  it('maps only known books-template field keys', async () => {
    invoke.mockResolvedValue({ data: { results: [DUNE_HIT] }, error: null });
    const template = TEMPLATES.find((t) => t.id === 'books')!;
    const keys = new Set(template.fields.map((f) => f.key));

    const results = await booksAdapter.searchByText('dune');

    for (const key of Object.keys(results[0].fields)) {
      expect(keys.has(key)).toBe(true);
    }
  });
});

// Scan routing through scanLookup

describe('scanLookup — books vertical', () => {
  it('routes a 978 EAN-13 straight to the ISBN index', async () => {
    invoke.mockResolvedValue({ data: { results: [DUNE_HIT] }, error: null });

    const outcome = await scanLookup('books', '9780441172719', 'ean13');

    expect(outcome.results).toHaveLength(1);
    expect(outcome.bridgeTitle).toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'books', op: 'lookup', params: { isbn: '9780441172719' } },
    });
  });

  it('sends a non-ISBN barcode to the UPC bridge, then text search', async () => {
    invoke
      .mockResolvedValueOnce({ data: { title: 'Dune (Ace paperback)', cached: true }, error: null })
      .mockResolvedValueOnce({ data: { results: [DUNE_HIT] }, error: null });

    const outcome = await scanLookup('books', '036000291452', 'upc_a');

    // First call is the bridge, NOT the books source.
    expect(invoke.mock.calls[0][1].body.source).toBe('upc');
    expect(invoke.mock.calls[1][1].body).toEqual({
      source: 'books',
      op: 'search',
      params: { q: 'Dune (Ace paperback)' },
    });
    expect(outcome.bridgeTitle).toBe('Dune (Ace paperback)');
  });
});
