/**
 * Purpose: Timepieces adapter tests — thewatchapi result → template field
 * mapping, barcode entry riding the same edge source, and the in-band
 * quota/key degradation surfacing as a human-readable error.
 * Author(s): John Reed
 */

// The real client throws without env vars and drags in RN internals; the
// metadata layer only touches functions.invoke.
jest.mock('@/auth/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '@/auth/client';
import { TEMPLATES } from '@/templates';

import { timepiecesAdapter } from '../adapters/timepieces';
import { MetadataProxyError } from '../proxy';

const invoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => {
  invoke.mockReset();
});

describe('timepieces adapter', () => {
  const watch = {
    brand: 'Rolex',
    model: 'Submariner Date',
    reference_number: '116610LN',
    movement: 'automatic',
    case_material: 'Stainless Steel',
    case_diameter: '40mm',
    year_of_production: '2010 - 2020',
  };

  it('maps a thewatchapi hit onto timepieces template fields', async () => {
    invoke.mockResolvedValue({ data: { data: [watch] } });

    const [result] = await timepiecesAdapter.searchByText('submariner');

    expect(result.title).toBe('Rolex Submariner Date');
    expect(result.subtitle).toBe('116610LN');
    expect(result.source).toBe('TheWatchAPI');
    expect(result.fields).toEqual({
      brand: 'Rolex',
      model: 'Submariner Date',
      reference_number: '116610LN',
      movement: 'Automatic', // normalized onto the template's select options
      case_material: 'Stainless Steel',
      case_diameter_mm: 40,
      production_years: '2010 - 2020',
    });

    // Every mapped key must exist on the timepieces template.
    const template = TEMPLATES.find((t) => t.id === 'timepieces')!;
    const keys = template.fields.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(Object.keys(result.fields)));
  });

  it('sends barcode entry through the same timepieces source as q', async () => {
    invoke.mockResolvedValue({ data: { data: [] } });

    await timepiecesAdapter.lookupByBarcode!('036000291452');

    expect(invoke).toHaveBeenCalledWith('metadata', {
      body: { source: 'timepieces', op: 'search', params: { q: '036000291452' } },
    });
  });

  it('surfaces the daily-limit payload as a friendly error', async () => {
    invoke.mockResolvedValue({
      data: { data: [], limited: true, message: 'daily lookup limit reached — try tomorrow or add manually' },
    });

    await expect(timepiecesAdapter.searchByText('rolex')).rejects.toThrow(
      'daily lookup limit reached — try tomorrow or add manually',
    );
  });

  it('surfaces the key-missing payload as a 503', async () => {
    invoke.mockResolvedValue({
      data: { data: [], unavailable: true, message: 'timepieces lookup is not configured — add details manually' },
    });

    const failure = await timepiecesAdapter.searchByText('rolex').catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(MetadataProxyError);
    expect((failure as MetadataProxyError).status).toBe(503);
    expect((failure as MetadataProxyError).message).toContain('not configured');
  });

  it('returns an empty list on a plain no-hit payload', async () => {
    invoke.mockResolvedValue({ data: { data: [] } });

    await expect(timepiecesAdapter.searchByText('nonexistent watch')).resolves.toEqual([]);
  });
});
