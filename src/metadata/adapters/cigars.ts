/**
 * Purpose: Cigars adapter — no clean cigar API exists (locked decision), so
 * this rides a curated seed dataset (~50 brands × flagship lines × standard
 * vitolas) exactly like funko rides its static dataset. Text search runs
 * locally; barcodes go through the edge fn's cigars source (UPC → cached
 * title → server-side fuzzy match). Manual entry stays the reliable path.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import type { CigarEntry, CigarMatch } from '../../../supabase/functions/metadata/cigar-match';
import {
  matchCigarTitle,
  searchCigars,
} from '../../../supabase/functions/metadata/cigar-match';
import { callMetadata, MetadataProxyError } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// Constants

// Edge fn response for a cigars barcode lookup.
interface CigarLookupHit {
  title: string;
  match: CigarEntry | null;
  confidence: number;
  box_count: number | null;
}

// Variables

let dataset: CigarEntry[] | null = null;

// Main

// The dataset lives next to the edge fn (Deno's bundler cannot reach outside
// supabase/functions; Metro can reach anywhere) — one copy, two runtimes.
// Lazy require so it only parses when a cigar collection actually searches.
function loadDataset(): CigarEntry[] {
  if (!dataset) {
    dataset = require('../../../supabase/functions/metadata/cigars-data.json') as CigarEntry[];
  }
  return dataset;
}

function mapEntry(entry: CigarEntry, boxCount?: number): MetadataResult {
  const fields: FieldValues = {
    brand: entry.brand,
    line: entry.line,
    vitola: entry.vitola,
    wrapper: entry.wrapper,
    binder: entry.binder,
    filler: entry.filler,
    ring_gauge: entry.ring_gauge,
    length_inches: entry.length_inches,
    country: entry.country,
  };
  if (entry.release_year !== null) fields.release_year = entry.release_year;
  if (boxCount !== undefined) fields.box_count = boxCount;

  return {
    title: `${entry.brand} ${entry.line} ${entry.vitola}`,
    subtitle: `${entry.wrapper} · ${entry.ring_gauge} × ${entry.length_inches}"`,
    fields,
    source: 'Cigar dataset',
  };
}

export const cigarsAdapter: MetadataAdapter = {
  templateId: 'cigars',

  // Local ranked search; a noisy title (bridge fallback path) that ranks
  // nothing still gets one shot at the stricter brand-gated matcher.
  async searchByText(query) {
    const seed = loadDataset();
    const ranked = searchCigars(query, seed);
    if (ranked.length > 0) {
      return ranked.map((m: CigarMatch) => mapEntry(m.entry));
    }

    const match = matchCigarTitle(query, seed);
    return match ? [mapEntry(match.entry, match.boxCount)] : [];
  },

  // UPC → title → server-side fuzzy match, one round trip. An unknown
  // barcode or an under-floor match returns [] so scanLookup falls back to
  // the bridge and manual entry starts with the raw product title.
  async lookupByBarcode(barcode) {
    if (!/^\d{12,13}$/.test(barcode)) return [];

    try {
      const hit = await callMetadata<CigarLookupHit>({
        source: 'cigars',
        op: 'lookup',
        params: { upc: barcode },
      });
      if (!hit.match) return [];
      return [mapEntry(hit.match, hit.box_count ?? undefined)];
    } catch (error) {
      // Unknown barcode is a routine miss, not a failure.
      if (error instanceof MetadataProxyError && error.status === 404) return [];
      throw error;
    }
  },
};
