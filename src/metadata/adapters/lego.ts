/**
 * Purpose: Lego adapter — Rebrickable through the metadata edge function.
 * Lego boxes print the set number, so a query that LOOKS like a set number
 * gets the exact-set endpoint; anything else falls to name search.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

interface RebrickableSet {
  set_num: string; // "75192-1"
  name: string;
  year?: number;
  num_parts?: number;
  set_img_url?: string | null;
}

interface RebrickableSearchResponse {
  results: RebrickableSet[];
}

// "75192" or "75192-1" — Rebrickable set numbers carry a "-1" suffix.
export function looksLikeSetNumber(query: string): boolean {
  return /^\d{3,7}(-\d+)?$/.test(query.trim());
}

function mapSet(set: RebrickableSet): MetadataResult {
  const fields: FieldValues = {
    set_number: set.set_num,
  };
  if (set.year) fields.release_year = set.year;
  if (set.num_parts) fields.piece_count = set.num_parts;

  return {
    title: set.name,
    subtitle: set.set_num,
    imageUrl: set.set_img_url ?? undefined,
    fields,
    source: 'Rebrickable',
  };
}

export const legoAdapter: MetadataAdapter = {
  templateId: 'lego',

  async searchByText(query) {
    const trimmed = query.trim();

    // Exact set lookup when the query is a set number.
    if (looksLikeSetNumber(trimmed)) {
      const setNum = trimmed.includes('-') ? trimmed : `${trimmed}-1`;
      const set = await callMetadata<RebrickableSet | null>({
        source: 'rebrickable',
        op: 'lookup',
        params: { set_num: setNum },
      });
      return set ? [mapSet(set)] : [];
    }

    const data = await callMetadata<RebrickableSearchResponse>({
      source: 'rebrickable',
      op: 'search',
      params: { q: trimmed },
    });
    return (data.results ?? []).map(mapSet);
  },
};
