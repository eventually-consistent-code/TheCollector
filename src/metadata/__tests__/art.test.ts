/**
 * Purpose: Art adapter tests — registry wiring, work-hit mapping onto the
 * art template (AIC + Met labels), artist-only prefill handling, and the
 * no-value-fields guarantee.
 * Author(s): John Reed
 */

// The real client throws without env vars and drags in RN internals; the
// metadata layer only touches functions.invoke.
jest.mock('@/auth/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '@/auth/client';

import { artAdapter } from '../adapters/art';
import { getAdapter } from '../index';

const invoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  invoke.mockReset();
});

// Registry

describe('art registry', () => {
  it('resolves the art adapter — text search only, no barcode path', () => {
    const adapter = getAdapter('art');

    expect(adapter).toBeDefined();
    expect(adapter!.templateId).toBe('art');
    // Art has no barcodes; the adapter must not pretend otherwise.
    expect(adapter!.lookupByBarcode).toBeUndefined();
  });
});

// Work-level mapping

describe('art adapter — work matches', () => {
  it('maps an AIC work onto template fields, name only from artist_display', async () => {
    invoke.mockResolvedValue({
      data: {
        match: 'work',
        works: [
          {
            title: 'The Bedroom',
            artist: 'Vincent van Gogh\nDutch, 1853–1890',
            date: 'c. 1889',
            medium: 'Oil on canvas',
            dimensions: '73.6 × 92.3 cm',
            imageUrl: 'https://www.artic.edu/iiif/2/abc/full/843,/0/default.jpg',
            source: 'aic',
          },
        ],
        artists: [],
      },
      error: null,
    });

    const results = await artAdapter.searchByText('the bedroom van gogh');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'The Bedroom',
      subtitle: 'Vincent van Gogh',
      imageUrl: 'https://www.artic.edu/iiif/2/abc/full/843,/0/default.jpg',
      fields: {
        artist: 'Vincent van Gogh',
        year: 1889,
        medium: 'Oil on canvas',
        dimensions: '73.6 × 92.3 cm',
      },
      source: 'Art Institute of Chicago',
    });
    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'art', op: 'search', params: { q: 'the bedroom van gogh' } },
    });
  });

  it('labels Met works as The Met and skips absent fields', async () => {
    invoke.mockResolvedValue({
      data: {
        match: 'work',
        works: [{ title: 'Untitled Study', source: 'met' }],
        artists: [],
      },
      error: null,
    });

    const results = await artAdapter.searchByText('untitled study');

    expect(results[0].source).toBe('The Met');
    expect(results[0].subtitle).toBeUndefined();
    expect(results[0].fields).toEqual({});
  });

  it('never sets value fields from a lookup', async () => {
    invoke.mockResolvedValue({
      data: {
        match: 'work',
        works: [
          {
            title: 'The Bedroom',
            artist: 'Vincent van Gogh',
            date: '1889',
            medium: 'Oil on canvas',
            dimensions: '73.6 × 92.3 cm',
            source: 'aic',
          },
        ],
        artists: [],
      },
      error: null,
    });

    const results = await artAdapter.searchByText('the bedroom');

    // Locked non-goal: no market data — insured_value is manual, always.
    for (const result of results) {
      expect('insured_value' in result.fields).toBe(false);
    }
  });
});

// Artist-only prefill

describe('art adapter — artist-only matches', () => {
  it('maps artist hits to the artist field only, leaving work fields manual', async () => {
    invoke.mockResolvedValue({
      data: {
        match: 'artist',
        works: [],
        artists: [{ name: 'Hilma af Klint', description: 'Swedish artist (1862–1944)' }],
      },
      error: null,
    });

    const results = await artAdapter.searchByText('hilma af klint');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'Hilma af Klint',
      subtitle: 'Swedish artist (1862–1944)',
      fields: { artist: 'Hilma af Klint' },
      source: 'Wikidata — artist only',
    });
    // Exactly one field prefilled — year/medium/dimensions stay open.
    expect(Object.keys(results[0].fields)).toEqual(['artist']);
  });

  it('returns empty on match:none', async () => {
    invoke.mockResolvedValue({
      data: { match: 'none', works: [], artists: [] },
      error: null,
    });

    await expect(artAdapter.searchByText('zzzz')).resolves.toEqual([]);
  });
});
