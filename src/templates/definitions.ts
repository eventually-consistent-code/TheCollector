/**
 * Purpose: The eight vertical templates + generic fallback. Field sets and
 * grading scales come from phase 3 RESEARCH.md — selects only for standards
 * that have not changed in decades; open sets stay text.
 * Author(s): John Reed
 */

import type { Template } from './types';

// Constants

// Goldmine scale — media and sleeve graded separately (Discogs marketplace scale).
const GOLDMINE = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const;

export const tradingCards: Template = {
  id: 'trading-cards',
  label: 'Trading Cards',
  subtitleKeys: ['set_name', 'card_number'],
  fields: [
    { key: 'game', label: 'Game', type: 'select', options: ['Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'Sports', 'Other'] },
    { key: 'set_name', label: 'Set', type: 'text' },
    { key: 'card_number', label: 'Card Number', type: 'text', placeholder: '182/165' },
    { key: 'rarity', label: 'Rarity', type: 'text' },
    { key: 'variant', label: 'Variant / Finish', type: 'text', placeholder: 'Holo, 1st Edition' },
    { key: 'language', label: 'Language', type: 'text' },
    { key: 'condition', label: 'Condition (raw)', type: 'select', options: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'] },
    { key: 'grading_company', label: 'Grading Company', type: 'select', options: ['Raw', 'PSA', 'BGS', 'CGC', 'SGC'] },
    { key: 'grade', label: 'Grade', type: 'number' },
    { key: 'cert_number', label: 'Cert Number', type: 'text' },
  ],
};

export const comics: Template = {
  id: 'comics',
  label: 'Comics',
  subtitleKeys: ['series', 'issue_number'],
  fields: [
    { key: 'series', label: 'Series', type: 'text' },
    { key: 'issue_number', label: 'Issue Number', type: 'text', placeholder: '#300' },
    { key: 'volume', label: 'Volume', type: 'text' },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'cover_date', label: 'Cover Date', type: 'date' },
    { key: 'variant', label: 'Variant Cover', type: 'text' },
    { key: 'key_issue', label: 'Key Issue Note', type: 'text', placeholder: '1st app. of…' },
    { key: 'grading_company', label: 'Grading Company', type: 'select', options: ['Raw', 'CGC', 'CBCS', 'PGX'] },
    { key: 'grade', label: 'Grade', type: 'number' },
    { key: 'cert_number', label: 'Cert Number', type: 'text' },
  ],
};

export const vinyl: Template = {
  id: 'vinyl',
  label: 'Vinyl',
  subtitleKeys: ['artist'],
  fields: [
    { key: 'artist', label: 'Artist', type: 'text' },
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'catalog_number', label: 'Catalog Number', type: 'text' },
    { key: 'release_year', label: 'Release Year', type: 'number' },
    { key: 'format', label: 'Format', type: 'select', options: ['LP', 'EP', '7"', '10"', '12" Single', '78 RPM', 'Box Set'] },
    { key: 'pressing', label: 'Pressing', type: 'text', placeholder: 'US 1st press, 180g reissue' },
    { key: 'media_condition', label: 'Media Condition', type: 'select', options: GOLDMINE },
    { key: 'sleeve_condition', label: 'Sleeve Condition', type: 'select', options: GOLDMINE },
  ],
};

export const videoGames: Template = {
  id: 'video-games',
  label: 'Video Games',
  subtitleKeys: ['platform'],
  fields: [
    { key: 'platform', label: 'Platform', type: 'text' },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'release_year', label: 'Release Year', type: 'number' },
    { key: 'region', label: 'Region', type: 'select', options: ['NTSC-U', 'NTSC-J', 'PAL', 'Region Free'] },
    { key: 'status', label: 'Completeness', type: 'select', options: ['Sealed', 'CIB', 'Box & Game', 'Game & Manual', 'Loose', 'Digital'] },
    { key: 'condition', label: 'Condition', type: 'select', options: ['Mint', 'Very Good', 'Good', 'Acceptable', 'Poor'] },
    { key: 'grading_company', label: 'Grading Company', type: 'select', options: ['None', 'WATA', 'VGA', 'CGC Games'] },
    { key: 'grade', label: 'Grade', type: 'number' },
  ],
};

export const movies: Template = {
  id: 'movies',
  label: 'Movies / Discs',
  subtitleKeys: ['format', 'edition'],
  fields: [
    { key: 'format', label: 'Format', type: 'select', options: ['DVD', 'Blu-ray', '4K UHD', '3D Blu-ray', 'VHS', 'LaserDisc'] },
    { key: 'edition', label: 'Edition', type: 'text', placeholder: 'Steelbook, Criterion #123' },
    { key: 'director', label: 'Director', type: 'text' },
    { key: 'release_year', label: 'Film Year', type: 'number' },
    { key: 'studio', label: 'Studio / Distributor', type: 'text' },
    { key: 'region_code', label: 'Region Code', type: 'select', options: ['Region Free', 'A/1', 'B/2', 'C/3'] },
    { key: 'condition', label: 'Condition', type: 'select', options: ['Sealed', 'Like New', 'Good', 'Acceptable', 'Poor'] },
    { key: 'slipcover', label: 'Has Slipcover', type: 'boolean' },
  ],
};

export const bourbon: Template = {
  id: 'bourbon',
  label: 'Bourbon / Liquor',
  subtitleKeys: ['distillery'],
  fields: [
    { key: 'distillery', label: 'Distillery', type: 'text' },
    { key: 'category', label: 'Category', type: 'select', options: ['Bourbon', 'Rye', 'Scotch', 'Irish', 'Japanese', 'Tequila', 'Rum', 'Other'] },
    { key: 'proof', label: 'Proof', type: 'number' },
    { key: 'age_statement', label: 'Age Statement', type: 'text', placeholder: '12 Year, NAS' },
    { key: 'bottle_size_ml', label: 'Bottle Size (ml)', type: 'select', options: ['375', '700', '750', '1000', '1750'] },
    { key: 'release_year', label: 'Release Year', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['Sealed', 'Opened', 'Empty'] },
    { key: 'fill_level', label: 'Fill Level', type: 'select', options: ['Full', 'Into Neck', 'Top Shoulder', 'Mid Shoulder', 'Low Shoulder'] },
    { key: 'store_pick', label: 'Store Pick / Single Barrel', type: 'boolean' },
    { key: 'msrp', label: 'MSRP', type: 'money' },
  ],
};

export const lego: Template = {
  id: 'lego',
  label: 'Lego',
  subtitleKeys: ['set_number'],
  fields: [
    { key: 'set_number', label: 'Set Number', type: 'text', placeholder: '75192-1' },
    { key: 'theme', label: 'Theme', type: 'text' },
    { key: 'piece_count', label: 'Piece Count', type: 'number' },
    { key: 'minifig_count', label: 'Minifigure Count', type: 'number' },
    { key: 'release_year', label: 'Release Year', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['NISB', 'Opened – Unbuilt', 'Built', 'Used – Complete', 'Used – Incomplete', 'Parts Only'] },
    { key: 'has_box', label: 'Has Box', type: 'boolean' },
    { key: 'has_instructions', label: 'Has Instructions', type: 'boolean' },
    { key: 'retired', label: 'Retired Set', type: 'boolean' },
  ],
};

export const funko: Template = {
  id: 'funko',
  label: 'Funko Pop',
  subtitleKeys: ['series', 'pop_number'],
  fields: [
    { key: 'series', label: 'Series / Line', type: 'text', placeholder: 'Pop! Movies' },
    { key: 'pop_number', label: 'Pop Number', type: 'number' },
    { key: 'exclusivity', label: 'Exclusivity', type: 'text', placeholder: 'Chase, SDCC 2024' },
    { key: 'status', label: 'Status', type: 'select', options: ['Sealed In Box', 'In Box – Opened', 'Out of Box'] },
    { key: 'box_condition', label: 'Box Condition', type: 'select', options: ['Mint', 'Near Mint', 'Good', 'Damaged', 'No Box'] },
    { key: 'vaulted', label: 'Vaulted', type: 'boolean' },
    { key: 'has_protector', label: 'Has Protector', type: 'boolean' },
    { key: 'variant', label: 'Glow / Flocked / Metallic', type: 'text' },
  ],
};

export const cigars: Template = {
  id: 'cigars',
  label: 'Cigars',
  subtitleKeys: ['line', 'vitola'],
  fields: [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'line', label: 'Line', type: 'text', placeholder: '1964 Anniversary' },
    { key: 'vitola', label: 'Vitola', type: 'text', placeholder: 'Robusto, Torpedo' },
    { key: 'wrapper', label: 'Wrapper', type: 'text', placeholder: 'Connecticut Broadleaf' },
    { key: 'binder', label: 'Binder', type: 'text' },
    { key: 'filler', label: 'Filler', type: 'text' },
    { key: 'ring_gauge', label: 'Ring Gauge', type: 'number' },
    { key: 'length_inches', label: 'Length (inches)', type: 'number' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'release_year', label: 'Release Year', type: 'number' },
    { key: 'box_count', label: 'Box Count', type: 'number' },
  ],
};

export const other: Template = {
  id: 'other',
  label: 'Other',
  subtitleKeys: [],
  fields: [
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'condition', label: 'Condition', type: 'text' },
  ],
};
