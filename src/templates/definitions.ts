/**
 * Purpose: The twelve vertical templates + generic fallback. Field sets and
 * grading scales come from phase 3 RESEARCH.md — selects only for standards
 * that have not changed in decades; open sets stay text. Phase 5.5 adds
 * art / timepieces / cigars / books (all manual entry — no lookup source).
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
    { key: 'year', label: 'Year', type: 'number' },
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

// Art is manual-entry only BY DESIGN — no market lookup exists that won't
// embarrass itself on fine art. Item name carries the work's title.
export const art: Template = {
  id: 'art',
  label: 'Art',
  subtitleKeys: ['artist', 'year'],
  fields: [
    { key: 'artist', label: 'Artist', type: 'text' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'medium', label: 'Medium', type: 'text', placeholder: 'Oil on canvas' },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: '24 × 36 in' },
    { key: 'provenance', label: 'Provenance Notes', type: 'text' },
    { key: 'exhibition_history', label: 'Exhibition History', type: 'text' },
    { key: 'insured_value', label: 'Purchase / Insured Value', type: 'money' },
  ],
};

export const timepieces: Template = {
  id: 'timepieces',
  label: 'Timepieces',
  subtitleKeys: ['brand', 'reference_number'],
  fields: [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'reference_number', label: 'Reference Number', type: 'text', placeholder: '116610LN' },
    { key: 'movement', label: 'Movement', type: 'select', options: ['Automatic', 'Manual Wind', 'Quartz', 'Solar', 'Spring Drive', 'Other'] },
    { key: 'case_material', label: 'Case Material', type: 'text', placeholder: 'Stainless steel, 18k gold' },
    { key: 'case_diameter_mm', label: 'Case Diameter (mm)', type: 'number' },
    { key: 'production_years', label: 'Production Years', type: 'text', placeholder: '1962–1974' },
    { key: 'has_box', label: 'Has Box', type: 'boolean' },
    { key: 'has_papers', label: 'Has Papers', type: 'boolean' },
  ],
};

export const cigars: Template = {
  id: 'cigars',
  label: 'Cigars',
  subtitleKeys: ['brand', 'vitola'],
  fields: [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'line', label: 'Line', type: 'text', placeholder: 'Serie V, Hemingway' },
    { key: 'vitola', label: 'Vitola', type: 'select', options: ['Petit Corona', 'Corona', 'Corona Gorda', 'Lonsdale', 'Robusto', 'Toro', 'Gordo', 'Churchill', 'Double Corona', 'Lancero', 'Panetela', 'Perfecto', 'Torpedo', 'Belicoso', 'Other'] },
    { key: 'wrapper', label: 'Wrapper', type: 'select', options: ['Connecticut Shade', 'Connecticut Broadleaf', 'Habano', 'Corojo', 'Criollo', 'Maduro', 'Oscuro', 'Candela', 'Cameroon', 'Sumatra', 'San Andrés', 'Other'] },
    { key: 'binder', label: 'Binder', type: 'text' },
    { key: 'filler', label: 'Filler', type: 'text' },
    { key: 'ring_gauge', label: 'Ring Gauge', type: 'number' },
    { key: 'length_inches', label: 'Length (in)', type: 'number' },
    { key: 'country', label: 'Country', type: 'text', placeholder: 'Nicaragua' },
    { key: 'release_year', label: 'Release Year', type: 'number' },
    { key: 'box_count', label: 'Box Count', type: 'number' },
  ],
};

// Edition/printing stays free text ON PURPOSE — the collector asserts it;
// no auto-detection scheme survives contact with real title pages.
export const books: Template = {
  id: 'books',
  label: 'Books',
  subtitleKeys: ['author'],
  fields: [
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'publish_date', label: 'Publish Date', type: 'date' },
    { key: 'isbn', label: 'ISBN', type: 'text', placeholder: '978-0-…' },
    { key: 'edition_printing', label: 'Edition / Printing', type: 'text', placeholder: '1st edition, 3rd printing' },
    { key: 'binding', label: 'Binding', type: 'select', options: ['Hardcover', 'Paperback', 'Trade Paperback', 'Mass Market', 'Leather Bound', 'Library Binding', 'Spiral', 'Other'] },
    { key: 'signed', label: 'Signed', type: 'boolean' },
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
