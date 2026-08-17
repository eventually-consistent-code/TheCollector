/**
 * Purpose: Trading cards adapter — TCGPriceLookup (keyed → proxied, image +
 * per-condition prices in one search response) and CardSight (cross-TCG +
 * sports, 12M+ cards, keyed → proxied) merged with Scryfall (MTG) and
 * Pokémon TCG API (both keyless, direct). Cards carry no barcodes, so this
 * is text-search only — CardSight finally covers the sports-card gap.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { directGet } from '../fetch';
import { callMetadata } from '../proxy';
import { CARDSIGHT_IMAGE_PREFIX, type MetadataAdapter, type MetadataResult } from '../types';

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
  id?: string;
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
  const year = Number(card.year);
  if (card.year && Number.isFinite(year)) fields.year = year;
  // Parallel is CardSight's variant concept; "/25" rides along when numbered.
  if (card.parallelName) {
    fields.variant = card.numberedTo
      ? `${card.parallelName} /${card.numberedTo}`
      : card.parallelName;
  }

  return {
    title: card.name,
    subtitle: [card.year, set].filter(Boolean).join(' · '),
    imageUrl: card.id ? `${CARDSIGHT_IMAGE_PREFIX}${card.id}` : undefined,
    fields,
    source: 'CardSight',
    sourceId: card.id,
  };
}

// TCGPriceLookup

interface TcgplConditionPrices {
  tcgplayer?: { market?: number; low?: number; mid?: number; high?: number };
}

interface TcgplCard {
  id?: string;
  name: string;
  number?: string;
  rarity?: string;
  variant?: string;
  image_url?: string;
  set?: { name?: string; slug?: string };
  game?: { name?: string; slug?: string };
  prices?: { raw?: Record<string, TcgplConditionPrices | undefined> };
}

interface TcgplSearchResponse {
  data?: TcgplCard[];
}

// Condition ladder for the value estimate: near-mint market is the standard
// quote, then progressively rougher conditions when it's missing. Buckets
// can be empty objects — dollars → cents, null when nothing numeric.
export function pickTcgplPriceCents(prices: TcgplCard['prices']): number | null {
  const raw = prices?.raw;
  if (!raw || typeof raw !== 'object') return null;

  const ladder = [
    'near_mint',
    'lightly_played',
    'moderately_played',
    'heavily_played',
    'damaged',
    'mint',
  ];
  for (const condition of ladder) {
    const market = raw[condition]?.tcgplayer?.market;
    if (typeof market === 'number' && Number.isFinite(market) && market > 0) {
      return Math.round(market * 100);
    }
  }
  return null;
}

function mapTcgPriceLookup(card: TcgplCard): MetadataResult {
  const fields: FieldValues = {};
  if (card.set?.name) fields.set_name = card.set.name;
  if (card.number) fields.card_number = card.number;
  if (card.rarity) fields.rarity = card.rarity;
  if (card.variant) fields.variant = card.variant;
  // Slug is the stable key; the display name is the fallback.
  const game = card.game?.slug ?? card.game?.name;
  if (game) fields.game = segmentToGame(game);

  return {
    title: card.name,
    subtitle: [card.set?.name, card.number].filter(Boolean).join(' · ') || undefined,
    // Plain https CDN url — popover thumbs and the save path just work.
    imageUrl: card.image_url,
    fields,
    source: 'TCGPriceLookup',
    valueCents: pickTcgplPriceCents(card.prices) ?? undefined,
  };
}

// Segment → template game option. CardSight spans sports and TCGs; the
// template's select only has five buckets, so everything maps down.
// TCGPriceLookup game slugs ride the same switch (pokemon, mtg, yugioh).
export function segmentToGame(segment: string): string {
  switch (segment.trim().toLowerCase()) {
    case 'baseball':
    case 'football':
    case 'basketball':
    case 'hockey':
    case 'soccer':
      return 'Sports';
    case 'pokemon':
    case 'pokémon':
      return 'Pokémon';
    case 'magic':
    case 'mtg':
    case 'magic: the gathering':
      return 'Magic: The Gathering';
    case 'yu-gi-oh':
    case 'yu-gi-oh!':
    case 'yugioh':
      return 'Yu-Gi-Oh!';
    default:
      return 'Other';
  }
}

// Pulls a string (or stringable number) out of an untyped detail payload.
// Defensive sales-comp parse — CardSight pricing payload shape is not
// pinned, so accept the common containers (flat array, sales/results/
// listings) and the common price keys, dollars in numbers or strings.
// Median of what's found, in cents; null when nothing parses.
export function estimateValueCents(payload: unknown): number | null {
  const obj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  // Live shape (verified 2026-08-16): { raw: { records: [{ price, date, … }] } }.
  const raw = obj?.raw && typeof obj.raw === 'object' ? (obj.raw as Record<string, unknown>) : null;
  const container = Array.isArray(payload)
    ? payload
    : (raw?.records ?? obj?.records ?? obj?.sales ?? obj?.results ?? obj?.listings ?? obj?.data);
  if (!Array.isArray(container)) return null;

  const prices = container
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const raw = r.price ?? r.soldPrice ?? r.salePrice ?? r.sold_price ?? r.amount;
      const num = typeof raw === 'string' ? Number(raw) : raw;
      return typeof num === 'number' && Number.isFinite(num) && num > 0 ? num : null;
    })
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  if (!prices.length) return null;

  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return Math.round(median * 100);
}

function detailString(card: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = card[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

// Main

export const tradingCardsAdapter: MetadataAdapter = {
  templateId: 'trading-cards',

  async searchByText(query) {
    const trimmed = query.trim();
    const encoded = encodeURIComponent(trimmed);

    // All four in parallel; any one failing (404 on no Scryfall match is
    // routine, the keyed sources need their keys deployed) just contributes
    // nothing.
    const [tcgpl, cardsight, scryfall, pokemon] = await Promise.allSettled([
      callMetadata<TcgplSearchResponse>({
        source: 'tcgpricelookup',
        op: 'search',
        params: { q: trimmed },
      }),
      callMetadata<CardSightSearchResponse>({
        source: 'cardsight',
        op: 'search',
        params: { q: trimmed },
      }),
      directGet<ScryfallSearchResponse>(`${SCRYFALL_SEARCH}?q=${encoded}`),
      directGet<PokemonSearchResponse>(`${POKEMON_SEARCH}?q=name:"${encoded}*"&pageSize=${MAX_PER_SOURCE}`),
    ]);

    const results: MetadataResult[] = [];
    // TCGPriceLookup first — its rows are the richest (image + prices).
    if (tcgpl.status === 'fulfilled') {
      results.push(...(tcgpl.value.data ?? []).slice(0, MAX_PER_SOURCE).map(mapTcgPriceLookup));
    }
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

  // Second pass after a pick — CardSight's search rows are thin, so hit the
  // card-detail endpoint for card number / segment / rarity. Defensive on
  // the payload shape (keys have shifted before) and any failure hands the
  // original result straight back.
  async enrich(result) {
    if (result.source !== 'CardSight' || !result.sourceId) return result;

    try {
      const detail = await callMetadata<Record<string, unknown>>({
        source: 'cardsight',
        op: 'lookup',
        params: { id: result.sourceId },
      });

      // Some payloads nest the card under a `card` key, some are flat.
      const nested = detail?.card;
      const card = (
        nested && typeof nested === 'object' ? nested : detail
      ) as Record<string, unknown> | null;
      if (!card || typeof card !== 'object') return result;

      const fields: FieldValues = { ...result.fields };

      const cardNumber = detailString(card, ['cardNumber', 'number', 'card_number']);
      if (cardNumber) fields.card_number = cardNumber;

      const segment = detailString(card, ['segment', 'segmentName', 'sport', 'category']);
      if (segment) fields.game = segmentToGame(segment);

      const rarity = detailString(card, ['rarity', 'rarityName']);
      if (rarity) fields.rarity = rarity;

      const variant = detailString(card, ['parallelName', 'variant']);
      if (variant) fields.variant = variant;

      // Sales comps ride a second op — its failure never spoils the detail
      // merge (nested try, not the outer one).
      let valueCents: number | undefined;
      try {
        const pricing = await callMetadata<unknown>({
          source: 'cardsight',
          op: 'pricing',
          params: { id: result.sourceId },
        });
        valueCents = estimateValueCents(pricing) ?? undefined;
      } catch {
        // No comps, no estimate — the field stays blank for the collector.
      }

      return { ...result, fields, valueCents };
    } catch {
      // Enrichment is a bonus, never a blocker.
      return result;
    }
  },
};
