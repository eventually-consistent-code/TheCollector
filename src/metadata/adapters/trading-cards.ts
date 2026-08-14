/**
 * Purpose: Trading cards adapter — CardSight (cross-TCG + sports, 12M+
 * cards, keyed → proxied) merged with Scryfall (MTG) and Pokémon TCG API
 * (both keyless, direct). Cards carry no barcodes, so this is text-search
 * only — CardSight finally covers the sports-card gap.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { directGet } from '../fetch';
import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// Constants

const SCRYFALL_SEARCH = 'https://api.scryfall.com/cards/search';
const POKEMON_SEARCH = 'https://api.pokemontcg.io/v2/cards';
const MAX_PER_SOURCE = 10;

// Scryfall

interface ScryfallCard {
  name: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  lang?: string;
  image_uris?: { small?: string };
}

interface ScryfallSearchResponse {
  data?: ScryfallCard[];
}

function mapScryfall(card: ScryfallCard): MetadataResult {
  const fields: FieldValues = { game: 'Magic: The Gathering' };
  if (card.set_name) fields.set_name = card.set_name;
  if (card.collector_number) fields.card_number = card.collector_number;
  if (card.rarity) fields.rarity = card.rarity;
  if (card.lang) fields.language = card.lang;

  return {
    title: card.name,
    subtitle: card.set_name,
    imageUrl: card.image_uris?.small,
    fields,
    source: 'Scryfall',
  };
}

// Pokémon TCG

interface PokemonCard {
  name: string;
  number?: string;
  rarity?: string;
  set?: { name?: string };
  images?: { small?: string };
}

interface PokemonSearchResponse {
  data?: PokemonCard[];
}

function mapPokemon(card: PokemonCard): MetadataResult {
  const fields: FieldValues = { game: 'Pokémon' };
  if (card.set?.name) fields.set_name = card.set.name;
  if (card.number) fields.card_number = card.number;
  if (card.rarity) fields.rarity = card.rarity;

  return {
    title: card.name,
    subtitle: card.set?.name,
    imageUrl: card.images?.small,
    fields,
    source: 'Pokémon TCG',
  };
}

// CardSight

interface CardSightResult {
  type: string; // card | set | release | parallel
  name: string;
  year?: string;
  setName?: string;
  releaseName?: string;
  manufacturerName?: string;
  parallelName?: string;
  numberedTo?: number;
}

interface CardSightSearchResponse {
  results: CardSightResult[];
}

function mapCardSight(card: CardSightResult): MetadataResult {
  const fields: FieldValues = {};
  const set = card.setName ?? card.releaseName;
  if (set) fields.set_name = set;
  // Parallel is CardSight's variant concept; "/25" rides along when numbered.
  if (card.parallelName) {
    fields.variant = card.numberedTo
      ? `${card.parallelName} /${card.numberedTo}`
      : card.parallelName;
  }

  return {
    title: card.name,
    subtitle: [card.year, set].filter(Boolean).join(' · '),
    fields,
    source: 'CardSight',
  };
}

// Main

export const tradingCardsAdapter: MetadataAdapter = {
  templateId: 'trading-cards',

  async searchByText(query) {
    const trimmed = query.trim();
    const encoded = encodeURIComponent(trimmed);

    // All three in parallel; any one failing (404 on no Scryfall match is
    // routine, CardSight needs its key deployed) just contributes nothing.
    const [cardsight, scryfall, pokemon] = await Promise.allSettled([
      callMetadata<CardSightSearchResponse>({
        source: 'cardsight',
        op: 'search',
        params: { q: trimmed },
      }),
      directGet<ScryfallSearchResponse>(`${SCRYFALL_SEARCH}?q=${encoded}`),
      directGet<PokemonSearchResponse>(`${POKEMON_SEARCH}?q=name:"${encoded}*"&pageSize=${MAX_PER_SOURCE}`),
    ]);

    const results: MetadataResult[] = [];
    if (cardsight.status === 'fulfilled') {
      results.push(
        ...(cardsight.value.results ?? [])
          .filter((r) => r.type === 'card')
          .slice(0, MAX_PER_SOURCE)
          .map(mapCardSight)
      );
    }
    if (pokemon.status === 'fulfilled') {
      results.push(...(pokemon.value.data ?? []).slice(0, MAX_PER_SOURCE).map(mapPokemon));
    }
    if (scryfall.status === 'fulfilled') {
      results.push(...(scryfall.value.data ?? []).slice(0, MAX_PER_SOURCE).map(mapScryfall));
    }
    return results;
  },
};
