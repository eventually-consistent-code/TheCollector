/**
 * Purpose: Vinyl adapter — Discogs through the metadata edge function. The
 * one vertical with a real barcode index: /database/search?barcode= hits
 * pressings directly, no bridge needed.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// Shape subset of a Discogs search result we actually read.
interface DiscogsRelease {
  title: string; // "Artist - Title"
  year?: string;
  label?: string[];
  catno?: string;
  format?: string[];
  thumb?: string;
}

interface DiscogsSearchResponse {
  results: DiscogsRelease[];
}

// Discogs titles come as "Artist - Title"; split once, keep the rest intact.
function mapRelease(release: DiscogsRelease): MetadataResult {
  const splitAt = release.title.indexOf(' - ');
  const artist = splitAt > 0 ? release.title.slice(0, splitAt) : '';
  const title = splitAt > 0 ? release.title.slice(splitAt + 3) : release.title;

  const fields: FieldValues = {};
  if (artist) fields.artist = artist;
  if (release.label?.[0]) fields.label = release.label[0];
  if (release.catno) fields.catalog_number = release.catno;
  if (release.year) fields.release_year = Number(release.year);

  return {
    title,
    subtitle: artist,
    imageUrl: release.thumb || undefined,
    fields,
    source: 'Discogs',
  };
}

export const vinylAdapter: MetadataAdapter = {
  templateId: 'vinyl',

  async searchByText(query) {
    const data = await callMetadata<DiscogsSearchResponse>({
      source: 'discogs',
      op: 'search',
      params: { q: query },
    });
    return (data.results ?? []).map(mapRelease);
  },

  async lookupByBarcode(barcode) {
    const data = await callMetadata<DiscogsSearchResponse>({
      source: 'discogs',
      op: 'lookup',
      params: { barcode },
    });
    return (data.results ?? []).map(mapRelease);
  },
};
