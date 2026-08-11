/**
 * Purpose: PowerSync schema for TheCollector — collections of items with
 * per-vertical custom fields riding in a JSON column (see phase 1 CONTEXT.md).
 * Author(s): John Reed
 */

import { column, Schema, Table } from '@powersync/common';

// Constants

// Verticals are placeholders until phase 3 lands real templates.
export const VERTICALS = [
  'trading-cards',
  'comics',
  'vinyl',
  'video-games',
  'movies',
  'bourbon',
  'lego',
  'funko',
  'other',
] as const;

export type Vertical = (typeof VERTICALS)[number];

// Tables

// A collection groups items under one vertical (e.g. "My Vinyl").
// Tables use the default synced shape — no connector is attached in phase 1,
// so writes queue locally; phase 2 attaches Supabase and they upload as-is.
const collections = new Table({
  user_id: column.text,
  name: column.text,
  vertical: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// An item belongs to a collection. Money lives in integer cents;
// custom_fields is a JSON blob owned by the vertical's template (phase 3).
const items = new Table(
  {
    user_id: column.text,
    collection_id: column.text,
    name: column.text,
    notes: column.text,
    acquired_at: column.text,
    purchase_price_cents: column.integer,
    current_value_cents: column.integer,
    custom_fields: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { collection: ['collection_id'] } }
);

export const AppSchema = new Schema({
  collections,
  items,
});

// Types

export type Database = (typeof AppSchema)['types'];
export type CollectionRecord = Database['collections'];
export type ItemRecord = Database['items'];
