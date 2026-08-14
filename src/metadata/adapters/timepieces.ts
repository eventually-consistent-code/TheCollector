/**
 * Purpose: Timepieces adapter — thewatchapi through the metadata edge
 * function. No native barcode index upstream; the edge function bridges a
 * scanned UPC to a product title (noise-stripped) before the catalog
 * search, and every query rides the permanent lookup cache because the
 * free tier is a stingy 25 calls/day.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata, MetadataProxyError } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// thewatchapi model-search hit — the spec-sheet subset we actually read.
interface WatchModel {
  brand?: string;
  model?: string;
  reference_number?: string;
  movement?: string;
  case_material?: string;
  case_diameter?: string | number; // "40" or "40mm" in the wild
  year_of_production?: string; // "2000 - 2016"
}

interface WatchSearchResponse {
  data?: WatchModel[];
  // Degraded modes the edge function reports in-band (never a 500):
  // limited = daily quota spent, unavailable = no API key configured.
  limited?: boolean;
  unavailable?: boolean;
  message?: string;
}

// The template's movement select options — match the API's free text
// against these so the select gets a value it knows; anything odd passes
// through untouched rather than being guessed at.
const MOVEMENT_OPTIONS = ['Automatic', 'Manual Wind', 'Quartz', 'Solar', 'Spring Drive', 'Other'];

function mapMovement(raw: string): string {
  const match = MOVEMENT_OPTIONS.find((option) => option.toLowerCase() === raw.trim().toLowerCase());
  return match ?? raw.trim();
}

function mapWatch(watch: WatchModel): MetadataResult {
  const fields: FieldValues = {};
  if (watch.brand) fields.brand = watch.brand;
  if (watch.model) fields.model = watch.model;
  if (watch.reference_number) fields.reference_number = watch.reference_number;
  if (watch.movement) fields.movement = mapMovement(watch.movement);
  if (watch.case_material) fields.case_material = watch.case_material;

  const diameter = Number.parseFloat(String(watch.case_diameter ?? ''));
  if (Number.isFinite(diameter)) fields.case_diameter_mm = diameter;

  if (watch.year_of_production) fields.production_years = watch.year_of_production;

  const title = [watch.brand, watch.model].filter(Boolean).join(' ');
  return {
    title: title || watch.reference_number || 'Unknown watch',
    subtitle: watch.reference_number,
    fields,
    source: 'TheWatchAPI',
  };
}

// Text and barcode queries take the same road — the edge function decides
// whether a digits-only query needs the UPC bridge first.
async function search(q: string): Promise<MetadataResult[]> {
  const data = await callMetadata<WatchSearchResponse>({
    source: 'timepieces',
    op: 'search',
    params: { q },
  });

  // Quota/key degradation arrives in-band; surface the friendly message
  // through the one throwable the UI already knows how to show.
  if (data.limited) {
    throw new MetadataProxyError(data.message ?? 'daily lookup limit reached — try tomorrow or add manually', 429);
  }
  if (data.unavailable) {
    throw new MetadataProxyError(data.message ?? 'timepieces lookup unavailable', 503);
  }

  return (data.data ?? []).map(mapWatch);
}

export const timepiecesAdapter: MetadataAdapter = {
  templateId: 'timepieces',

  async searchByText(query) {
    return search(query);
  },

  // No native barcode index — hand the digits to the edge function, which
  // resolves them through the shared UPC bridge before searching.
  async lookupByBarcode(barcode) {
    return search(barcode);
  },
};
