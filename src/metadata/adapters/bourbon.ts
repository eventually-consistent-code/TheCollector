/**
 * Purpose: Bourbon/liquor adapter — Open Food Facts, keyless and direct.
 * Coverage of US bourbon is honestly spotty; a barcode miss here falls back
 * to manual entry with whatever the bridge found (see lookup.ts).
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { directGet } from '../fetch';
import { MetadataProxyError } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// Constants

const OFF_PRODUCT = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';

interface OffProduct {
  product_name?: string;
  brands?: string;
  quantity?: string; // "750 ml"
  image_url?: string;
}

interface OffProductResponse {
  status: number; // 1 = found
  product?: OffProduct;
}

interface OffSearchResponse {
  products?: OffProduct[];
}

function mapProduct(product: OffProduct): MetadataResult {
  const fields: FieldValues = {};
  if (product.brands) fields.distillery = product.brands.split(',')[0].trim();

  // "750 ml" / "70 cl" → template's ml select where it lines up.
  const size = product.quantity?.match(/(\d+)\s*(ml|cl)/i);
  if (size) {
    const ml = size[2].toLowerCase() === 'cl' ? Number(size[1]) * 10 : Number(size[1]);
    fields.bottle_size_ml = String(ml);
  }

  return {
    title: product.product_name ?? 'Unknown Bottle',
    subtitle: product.brands,
    imageUrl: product.image_url,
    fields,
    source: 'Open Food Facts',
  };
}

export const bourbonAdapter: MetadataAdapter = {
  templateId: 'bourbon',

  async searchByText(query) {
    const encoded = encodeURIComponent(query.trim());
    const data = await directGet<OffSearchResponse>(
      `${OFF_SEARCH}?search_terms=${encoded}&json=1&page_size=10`
    );
    return (data.products ?? []).filter((p) => p.product_name).map(mapProduct);
  },

  async lookupByBarcode(barcode) {
    try {
      const data = await directGet<OffProductResponse>(`${OFF_PRODUCT}/${barcode}.json`);
      if (data.status !== 1 || !data.product) return [];
      return [mapProduct(data.product)];
    } catch (error) {
      // OFF 404s unknown barcodes — that's a miss, not a failure.
      if (error instanceof MetadataProxyError && error.status === 404) return [];
      throw error;
    }
  },
};
