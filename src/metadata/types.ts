/**
 * Purpose: Metadata lookup model — one adapter interface every vertical
 * implements, and the normalized result shape that prefills the add-item
 * form (title + template custom_fields).
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

// CardSight card art is keyed — no public URL exists. Results carry this
// sentinel prefix + card id instead of an https url; saveLookupImage spots
// it and fetches the bytes through the edge function's 'image' op. UI code
// must never hand it to an <Image>.
export const CARDSIGHT_IMAGE_PREFIX = 'cardsight-image:';

// A single lookup hit, normalized onto the vertical's template. `fields`
// keys match the template's FieldDef keys; unknown keys are dropped by the
// form. `title` prefills the item name.
export interface MetadataResult {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  fields: FieldValues;
  // Where this hit came from, for attribution in the picker UI.
  source: string;
  // The source's own id for this hit — fuels enrich-on-pick detail lookups.
  sourceId?: string;
  // Estimated market value in cents (recent completed sales) — item-level,
  // not a template field; the form offers it into Current Value when empty.
  valueCents?: number;
}

// One adapter per vertical, registered by template id. Barcode lookup is
// optional — only sources that truly support it implement it (Discogs);
// everyone else rides the UPC→title bridge + text search (see lookup.ts).
export interface MetadataAdapter {
  templateId: string;
  searchByText(query: string): Promise<MetadataResult[]>;
  lookupByBarcode?(barcode: string): Promise<MetadataResult[]>;
  // Optional second pass after a pick — a detail lookup that fills fields
  // the search response was too thin to carry. Must resolve to the original
  // result on any trouble; callers race it against a short timeout.
  enrich?(result: MetadataResult): Promise<MetadataResult>;
}
