/**
 * Purpose: Trading cards adapter — Scryfall (MTG) + Pokémon TCG API, both
 * keyless and called direct from the client. Cards carry no barcodes, so
 * this is text-search only; sports cards stay manual entry.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { directGet } from '../fetch';
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

// Main

export const tradingCardsAdapter: MetadataAdapter = {
  templateId: 'trading-cards',

  async searchByText(query) {
    const encoded = encodeURIComponent(query.trim());

    // Both sources in parallel; either failing (404 on no Scryfall match is
    // routine) just contributes nothing.
    const [scryfall, pokemon] = await Promise.allSettled([
      directGet<ScryfallSearchResponse>(`${SCRYFALL_SEARCH}?q=${encoded}`),
      directGet<PokemonSearchResponse>(`${POKEMON_SEARCH}?q=name:"${encoded}*"&pageSize=${MAX_PER_SOURCE}`),
    ]);

    const results: MetadataResult[] = [];
    if (pokemon.status === 'fulfilled') {
      results.push(...(pokemon.value.data ?? []).slice(0, MAX_PER_SOURCE).map(mapPokemon));
    }
    if (scryfall.status === 'fulfilled') {
      results.push(...(scryfall.value.data ?? []).slice(0, MAX_PER_SOURCE).map(mapScryfall));
    }
    return results;
  },
};
