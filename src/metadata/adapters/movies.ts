/**
 * Purpose: Movies adapter — OMDb through the metadata edge function. Chosen
 * over TMDB for commercial licensing (OMDb free tier + cheap patron tiers
 * vs TMDB's ~$150/mo commercial license). No barcode index; disc scans
 * arrive as bridge-resolved titles.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// OMDb search hit (s= endpoint). Fields are capitalized; missing values come
// back as the literal string "N/A".
interface OmdbMovie {
  Title: string;
  Year?: string; // "1993"
  Poster?: string; // URL or "N/A"
  imdbID?: string;
}

interface OmdbSearchResponse {
  Search?: OmdbMovie[];
  Response: string; // "True" | "False"
}

function mapMovie(movie: OmdbMovie): MetadataResult {
  const fields: FieldValues = {};

  const year = movie.Year?.match(/^\d{4}/)?.[0];
  if (year) fields.release_year = Number(year);

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : undefined;

  return {
    title: movie.Title,
    subtitle: year,
    imageUrl: poster,
    fields,
    source: 'OMDb',
  };
}

export const moviesAdapter: MetadataAdapter = {
  templateId: 'movies',

  async searchByText(query) {
    const data = await callMetadata<OmdbSearchResponse>({
      source: 'omdb',
      op: 'search',
      params: { q: query },
    });
    // OMDb signals "no results" with Response:"False", not an empty array.
    if (data.Response !== 'True') return [];
    return (data.Search ?? []).map(mapMovie);
  },
};
