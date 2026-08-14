/**
 * Purpose: Video games adapter — IGDB through the metadata edge function
 * (Twitch OAuth lives server-side). IGDB has no UPC index, so barcode scans
 * arrive here as bridge-resolved titles via searchByText.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

interface IgdbGame {
  name: string;
  first_release_date?: number; // unix seconds
  platforms?: { name: string }[];
  involved_companies?: { company: { name: string }; publisher: boolean }[];
  cover?: { url: string };
}

function mapGame(game: IgdbGame): MetadataResult {
  const fields: FieldValues = {};

  const platform = game.platforms?.map((p) => p.name).join(', ');
  if (platform) fields.platform = platform;

  const publisher = game.involved_companies?.find((c) => c.publisher)?.company.name;
  if (publisher) fields.publisher = publisher;

  if (game.first_release_date) {
    fields.release_year = new Date(game.first_release_date * 1000).getUTCFullYear();
  }

  // IGDB cover urls are protocol-relative thumbnails; upsize for the picker.
  const cover = game.cover?.url
    ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
    : undefined;

  return {
    title: game.name,
    subtitle: platform,
    imageUrl: cover,
    fields,
    source: 'IGDB',
  };
}

export const videoGamesAdapter: MetadataAdapter = {
  templateId: 'video-games',

  async searchByText(query) {
    const data = await callMetadata<IgdbGame[]>({
      source: 'igdb',
      op: 'search',
      params: { q: query },
    });
    return (data ?? []).map(mapGame);
  },
};
