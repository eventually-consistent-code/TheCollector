/**
 * Purpose: PowerSync schema for TheCollector — collections of items with
 * per-vertical custom fields riding in a JSON column (see phase 1 CONTEXT.md).
 * Author(s): John Reed
 */

import { AttachmentTable, column, Schema, Table } from '@powersync/common';

// Constants

// Vertical ids live in the template registry (src/templates); the db layer
// treats them as opaque strings.
export type Vertical = string;

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
    // JSON array of lowercase tag strings (phase 6) — normalized in crud.ts.
    tags: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { collection: ['collection_id'] } }
);

// Photo metadata — binaries ride the attachment queue, not sync.
const photos = new Table(
  {
    user_id: column.text,
    item_id: column.text,
    media_type: column.text,
    created_at: column.text,
  },
  { indexes: { item: ['item_id'] } }
);

export const AppSchema = new Schema({
  collections,
  items,
  photos,
  // Local-only queue state for the attachment system (never syncs).
  attachments: new AttachmentTable(),
});

// Types

export type Database = (typeof AppSchema)['types'];
export type CollectionRecord = Database['collections'];
export type ItemRecord = Database['items'];
