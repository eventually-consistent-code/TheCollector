/**
 * Purpose: Art adapter — AIC / Met / Wikidata through the metadata edge
 * function. Text search only; art has no barcodes. Work-level hits prefill
 * the full template; artist-only hits (the usual case for private pieces)
 * prefill just the artist field and leave the rest for manual entry. Value
 * fields are never populated from any source, by design.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// Payload shape from the edge function's art source (keep in lockstep with
// supabase/functions/metadata/art.ts — that file is Deno's, not this tsc's).
interface ArtWork {
  title: string;
  artist?: string; // AIC style: "Vincent van Gogh\nDutch, 1853–1890"
  date?: string; // display string: "1889", "c. 1884–86"
  medium?: string;
  dimensions?: string;
  imageUrl?: string;
  source: 'aic' | 'met';
}

interface ArtArtist {
  name: string;
  description?: string;
}

interface ArtSearchPayload {
  match: 'work' | 'artist' | 'none';
  works?: ArtWork[];
  artists?: ArtArtist[];
}

// Constants

const SOURCE_LABELS: Record<ArtWork['source'], string> = {
  aic: 'Art Institute of Chicago',
  met: 'The Met',
};

// Helpers

// AIC's artist_display carries nationality/dates on following lines — the
// artist field wants just the name.
function artistName(display: string): string {
  return display.split('\n')[0].trim();
}

function mapWork(work: ArtWork): MetadataResult {
  const fields: FieldValues = {};

  const artist = work.artist ? artistName(work.artist) : '';
  if (artist) fields.artist = artist;

  // Display dates are prose ("c. 1884–86"); the first 4-digit run is the year.
  const year = work.date?.match(/\d{4}/)?.[0];
  if (year) fields.year = Number(year);

  if (work.medium) fields.medium = work.medium;
  if (work.dimensions) fields.dimensions = work.dimensions;
  // insured_value stays untouched BY DESIGN — no market data, ever.

  return {
    title: work.title,
    subtitle: artist || undefined,
    imageUrl: work.imageUrl,
    fields,
    source: SOURCE_LABELS[work.source],
  };
}

// Artist-only hit — name lands in the artist field, every work field stays
// open for manual entry (locked UX rule: private pieces usually miss at
// work level, so this is the common path).
function mapArtist(artist: ArtArtist): MetadataResult {
  return {
    title: artist.name,
    subtitle: artist.description,
    fields: { artist: artist.name },
    source: 'Wikidata — artist only',
  };
}

export const artAdapter: MetadataAdapter = {
  templateId: 'art',

  async searchByText(query) {
    const data = await callMetadata<ArtSearchPayload>({
      source: 'art',
      op: 'search',
      params: { q: query },
    });

    if (data.match === 'work') return (data.works ?? []).map(mapWork);
    if (data.match === 'artist') return (data.artists ?? []).map(mapArtist);
    return [];
  },
};
