/**
 * Purpose: UPC → product-title bridge for verticals without their own
 * barcode index. The edge function checks the shared upc_cache table first,
 * then UPCitemdb's trial tier (100/day) — so every barcode on earth costs
 * us at most one upstream call, ever.
 * Author(s): John Reed
 */

import { callMetadata, MetadataProxyError } from './proxy';

export interface BridgeHit {
  title: string;
  brand?: string;
  cached: boolean;
}

// Resolves a UPC to a product title, or null on a genuine miss.
export async function bridgeLookup(upc: string): Promise<BridgeHit | null> {
  try {
    return await callMetadata<BridgeHit>({
      source: 'upc',
      op: 'lookup',
      params: { upc },
    });
  } catch (error) {
    if (error instanceof MetadataProxyError && error.status === 404) return null;
    throw error;
  }
}
