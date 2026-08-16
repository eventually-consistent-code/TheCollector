/**
 * Purpose: Filtered item-list tests — buildItemsQuery composition and the
 * distinct-tags facet query, pure first, then executed against a real
 * PowerSync SQLite db (@powersync/node) to prove the SQL actually runs.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import {
  buildItemsQuery,
  compileFilters,
  DISTINCT_TAGS_SQL,
  FIRST_PHOTO_URI_SQL,
} from '../query';
import { AppSchema } from '../schema';
import type { FieldDef } from '../../templates';

// Template-ish defs matching the seeded custom_fields below.
const DEFS: readonly FieldDef[] = [
  { key: 'condition', label: 'Condition', type: 'select', options: ['Mint', 'Poor'] },
];

//*************************************************************************
// Pure tests — no db
//*************************************************************************

// Every list SELECT leads with the item columns plus the first-photo thumb.
const SELECT_HEAD = `SELECT items.*, ${FIRST_PHOTO_URI_SQL} AS thumb_uri FROM items`;

describe('buildItemsQuery', () => {
  test('no filter compiles to the plain useItems query plus thumb_uri', () => {
    expect(buildItemsQuery('c1', 'newest')).toEqual({
      sql: `${SELECT_HEAD} WHERE collection_id = ? ORDER BY created_at DESC`,
      params: ['c1'],
    });
  });

  test('empty compiled fragment is not appended', () => {
    const out = buildItemsQuery('c1', 'name_asc', {
      compiled: { sql: '', params: [] },
    });
    expect(out.sql).toBe(
      `${SELECT_HEAD} WHERE collection_id = ? ORDER BY name COLLATE NOCASE ASC`
    );
    expect(out.params).toEqual(['c1']);
  });

  test('value range and compiled clauses compose; params track clause order', () => {
    const compiled = compileFilters(DEFS, { fields: { condition: 'Mint' } });
    const out = buildItemsQuery('c1', 'value_desc', {
      compiled,
      value: { min: 100, max: 5000 },
    });
    expect(out.sql).toBe(
      `${SELECT_HEAD} WHERE collection_id = ? ` +
        `AND current_value_cents >= ? AND current_value_cents <= ? ` +
        `AND (${compiled.sql}) ` +
        `ORDER BY (current_value_cents IS NULL), current_value_cents DESC`
    );
    expect(out.params).toEqual(['c1', 100, 5000, 'Mint']);
  });

  test('one-sided value range binds only its side', () => {
    const out = buildItemsQuery('c1', 'newest', { value: { max: 250 } });
    expect(out.sql).toContain('current_value_cents <= ?');
    expect(out.sql).not.toContain('>=');
    expect(out.params).toEqual(['c1', 250]);
  });
});

describe('DISTINCT_TAGS_SQL', () => {
  test('guards NULL and malformed tags before json_each, scoped by one param', () => {
    expect(DISTINCT_TAGS_SQL).toContain('SELECT DISTINCT json_each.value AS tag');
    expect(DISTINCT_TAGS_SQL).toContain('tags IS NOT NULL AND json_valid(tags)');
    expect(DISTINCT_TAGS_SQL).toContain('collection_id = ?');
    expect(DISTINCT_TAGS_SQL).toContain('ORDER BY tag');
    // Exactly one bind — the collection id.
    expect(DISTINCT_TAGS_SQL.match(/\?/g)).toHaveLength(1);
  });
});

//*************************************************************************
// Executed against a real db — proves the SQL actually parses and runs
//*************************************************************************

describe('filtered list SQL runs on a real PowerSync db', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  const insertItem = async (
    id: string,
    collectionId: string,
    name: string,
    customFields: string | null,
    tags: string | null,
    valueCents: number | null
  ) => {
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, custom_fields, tags, current_value_cents, created_at)
       VALUES (?, 'u1', ?, ?, ?, ?, ?, datetime('now'))`,
      [id, collectionId, name, customFields, tags, valueCents]
    );
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-filtered-list-test-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();

    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c1', 'u1', 'Cards', 'trading_cards', datetime('now'))`
    );
    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c2', 'u1', 'Other Cards', 'trading_cards', datetime('now'))`
    );

    await insertItem('i1', 'c1', 'Alpha', '{"condition": "Mint"}', '["rare","graded"]', 500);
    await insertItem('i2', 'c1', 'Bravo', '{"condition": "Poor"}', '["rare"]', 100);
    // Pre-tagging row: NULL tags, NULL custom fields, no value.
    await insertItem('i3', 'c1', 'Charlie', null, null, null);
    // Malformed leftovers: empty strings must never blow up json functions.
    await insertItem('i4', 'c1', 'Delta', '', '', 250);
    // Another collection — must never bleed into c1 results.
    await insertItem('i5', 'c2', 'Echo', '{"condition": "Mint"}', '["other"]', 999);
  });

  afterAll(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = async (out: { sql: string; params: unknown[] }) =>
    (await db.getAll<any>(out.sql, out.params as any[])).map((r) => r.id);

  test('distinct tags are per-collection, alphabetical, and skip NULL/malformed', async () => {
    const c1 = await db.getAll<any>(DISTINCT_TAGS_SQL, ['c1']);
    expect(c1.map((r) => r.tag)).toEqual(['graded', 'rare']);

    const c2 = await db.getAll<any>(DISTINCT_TAGS_SQL, ['c2']);
    expect(c2.map((r) => r.tag)).toEqual(['other']);
  });

  test('unfiltered query returns the whole collection, sorted', async () => {
    const ids = await run(buildItemsQuery('c1', 'name_asc'));
    expect(ids).toEqual(['i1', 'i2', 'i3', 'i4']);
  });

  test('value range filters at the item level; NULL values never match', async () => {
    expect(await run(buildItemsQuery('c1', 'name_asc', { value: { min: 150 } }))).toEqual(
      ['i1', 'i4']
    );
    expect(await run(buildItemsQuery('c1', 'name_asc', { value: { max: 300 } }))).toEqual(
      ['i2', 'i4']
    );
  });

  test('compiled field + tag filters compose with the value range', async () => {
    const mintRare = compileFilters(DEFS, { fields: { condition: 'Mint' } });
    expect(
      await run(buildItemsQuery('c1', 'name_asc', { compiled: mintRare }))
    ).toEqual(['i1']);

    const tagged = compileFilters(DEFS, { tags: ['rare'] });
    expect(
      await run(buildItemsQuery('c1', 'name_asc', { compiled: tagged, value: { max: 300 } }))
    ).toEqual(['i2']);
  });

  test('filters ride along with every sort direction', async () => {
    const tagged = compileFilters(DEFS, { tags: ['rare'] });
    expect(
      await run(buildItemsQuery('c1', 'value_desc', { compiled: tagged }))
    ).toEqual(['i1', 'i2']);
    expect(
      await run(buildItemsQuery('c1', 'value_asc', { compiled: tagged }))
    ).toEqual(['i2', 'i1']);
  });

  test('rows carry thumb_uri; photo-less rows stay NULL; counts hold', async () => {
    // Seed one renderable photo on i1 — the subquery must decorate that row
    // only, without duplicating or dropping anything.
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('ph1', 'u1', 'i1', '2026-08-01')`
    );
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('ph1', 'ph1.jpg', 'file:///photos/ph1.jpg', 3, 1)`
    );

    const out = buildItemsQuery('c1', 'name_asc');
    const rows = await db.getAll<any>(out.sql, out.params as any[]);
    expect(rows.map((r) => r.id)).toEqual(['i1', 'i2', 'i3', 'i4']);
    expect(rows[0].thumb_uri).toBe('file:///photos/ph1.jpg');
    expect(rows.slice(1).map((r) => r.thumb_uri)).toEqual([null, null, null]);
  });
});
