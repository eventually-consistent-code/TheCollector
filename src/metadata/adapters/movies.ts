/**
 * Purpose: Movies adapter — TMDB through the metadata edge function. No
 * barcode index at TMDB; disc scans arrive as bridge-resolved titles.
 * Director stays blank (needs a credits round-trip — not worth it for
 * prefill).
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

interface TmdbMovie {
  title: string;
  release_date?: string; // YYYY-MM-DD
  poster_path?: string | null;
}

interface TmdbSearchResponse {
  results: TmdbMovie[];
}

function mapMovie(movie: TmdbMovie): MetadataResult {
  const fields: FieldValues = {};

  const year = movie.release_date?.slice(0, 4);
  if (year) fields.release_year = Number(year);

  return {
    title: movie.title,
    subtitle: year,
    imageUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : undefined,
    fields,
    source: 'TMDB',
  };
}

export const moviesAdapter: MetadataAdapter = {
  templateId: 'movies',

  async searchByText(query) {
    const data = await callMetadata<TmdbSearchResponse>({
      source: 'tmdb',
      op: 'search',
      params: { q: query },
    });
    return (data.results ?? []).map(mapMovie);
  },
};
