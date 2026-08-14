/**
 * Purpose: Adapter registry keyed by template id (mirrors src/templates),
 * plus the scan orchestration: native barcode → adapter or bridge → results
 * that prefill the add-item form. 'other' and any unmapped vertical get
 * manual entry.
 * Author(s): John Reed
 */

import { artAdapter } from './adapters/art';
import { booksAdapter } from './adapters/books';
import { bourbonAdapter } from './adapters/bourbon';
import { comicsAdapter } from './adapters/comics';
import { funkoAdapter } from './adapters/funko';
import { legoAdapter } from './adapters/lego';
import { moviesAdapter } from './adapters/movies';
import { tradingCardsAdapter } from './adapters/trading-cards';
import { videoGamesAdapter } from './adapters/video-games';
import { vinylAdapter } from './adapters/vinyl';
import { bridgeLookup } from './bridge';
import type { MetadataAdapter, MetadataResult } from './types';
import { normalizeBarcode } from './upc';

export type { MetadataAdapter, MetadataResult } from './types';
export { normalizeBarcode, SCAN_BARCODE_TYPES } from './upc';
export { MetadataProxyError } from './proxy';

// Constants

const ADAPTERS: Record<string, MetadataAdapter> = {
  'trading-cards': tradingCardsAdapter,
  comics: comicsAdapter,
  vinyl: vinylAdapter,
  'video-games': videoGamesAdapter,
  movies: moviesAdapter,
  bourbon: bourbonAdapter,
  lego: legoAdapter,
  funko: funkoAdapter,
  art: artAdapter,
  books: booksAdapter,
  // 'other' intentionally absent — manual entry only.
  // 'timepieces' / 'cigars' also absent BY DESIGN
  // (phase 5.5) — no lookup source earns its keep for these yet.
};

export function getAdapter(templateId: string): MetadataAdapter | undefined {
  return ADAPTERS[templateId];
}

// Main

// What a finished scan hands the add-item form. `bridgeTitle` carries the
// bridge's product name even when the vertical's source had no hits, so
// manual entry starts with SOMETHING.
export interface ScanLookupOutcome {
  results: MetadataResult[];
  bridgeTitle?: string;
}

// One entry point for the scan screen: barcode in, prefill candidates out.
// Direct-barcode verticals (vinyl/Discogs, bourbon/OFF) hit their own index;
// everyone else resolves UPC → title → text search.
export async function scanLookup(templateId: string, data: string, type: string): Promise<ScanLookupOutcome> {
  const adapter = getAdapter(templateId);
  if (!adapter) return { results: [] };

  const barcode = normalizeBarcode(data, type);

  if (adapter.lookupByBarcode) {
    const results = await adapter.lookupByBarcode(barcode.value);
    if (results.length > 0) return { results };
  }

  const hit = await bridgeLookup(barcode.value);
  if (!hit) return { results: [] };

  const results = await adapter.searchByText(hit.title);
  return { results, bridgeTitle: hit.title };
}
