/**
 * Purpose: Metadata lookup model — one adapter interface every vertical
 * implements, and the normalized result shape that prefills the add-item
 * form (title + template custom_fields).
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

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
}

// One adapter per vertical, registered by template id. Barcode lookup is
// optional — only sources that truly support it implement it (Discogs);
// everyone else rides the UPC→title bridge + text search (see lookup.ts).
export interface MetadataAdapter {
  templateId: string;
  searchByText(query: string): Promise<MetadataResult[]>;
  lookupByBarcode?(barcode: string): Promise<MetadataResult[]>;
}
