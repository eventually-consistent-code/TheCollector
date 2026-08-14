/**
 * Purpose: Comics adapter — Comic Vine through the metadata edge function.
 * No UPC field in their API; barcode scans arrive as bridge-resolved titles.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

interface ComicVineIssue {
  name?: string | null;
  issue_number?: string;
  cover_date?: string; // YYYY-MM-DD
  volume?: { name: string };
  image?: { small_url?: string };
}

interface ComicVineSearchResponse {
  results: ComicVineIssue[];
}

function mapIssue(issue: ComicVineIssue): MetadataResult {
  const fields: FieldValues = {};
  const series = issue.volume?.name;

  if (series) fields.series = series;
  if (issue.issue_number) fields.issue_number = `#${issue.issue_number}`;
  if (issue.cover_date) fields.cover_date = issue.cover_date;

  const numberBit = issue.issue_number ? ` #${issue.issue_number}` : '';

  return {
    title: series ? `${series}${numberBit}` : (issue.name ?? 'Unknown Issue'),
    subtitle: issue.name ?? undefined,
    imageUrl: issue.image?.small_url,
    fields,
    source: 'Comic Vine',
  };
}

export const comicsAdapter: MetadataAdapter = {
  templateId: 'comics',

  async searchByText(query) {
    const data = await callMetadata<ComicVineSearchResponse>({
      source: 'comicvine',
      op: 'search',
      params: { q: query },
    });
    return (data.results ?? []).map(mapIssue);
  },
};
