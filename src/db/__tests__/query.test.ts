/**
 * Purpose: Query-layer tests — the pure compiler/sort/search builders need no
 * db at all; a second block executes the generated SQL against a real
 * PowerSync SQLite db (@powersync/node) to prove the fragments actually run.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import {
  buildSearchQuery,
  compileFilters,
  escapeLike,
  orderByFor,
  DEFAULT_SORT,
  FIRST_PHOTO_URI_SQL,
} from '../query';
import type { ItemSort } from '../query';
import { AppSchema } from '../schema';
import type { FieldDef } from '../../templates';

// Template-ish defs for compiler tests — one of each filterable type.
const DEFS: readonly FieldDef[] = [
  { key: 'condition', label: 'Condition', type: 'select', options: ['Mint', 'Good', 'Poor'] },
  { key: 'signed', label: 'Signed', type: 'boolean' },
  { key: 'piece_count', label: 'Pieces', type: 'number' },
  { key: 'sticker_price', label: 'Sticker price', type: 'money' },
  { key: 'artist', label: 'Artist', type: 'text' },
];

//*************************************************************************
// Pure tests — no db
//*************************************************************************

describe('escapeLike', () => {
  test('escapes %, _, and backslash', () => {
    expect(escapeLike('50%_off\\deal')).toBe('50\\%\\_off\\\\deal');
  });

  test('leaves plain text alone', () => {
    expect(escapeLike('blue note 1568')).toBe('blue note 1568');
  });
});

describe('buildSearchQuery', () => {
  test('empty and whitespace-only queries return null', () => {
    expect(buildSearchQuery('')).toBeNull();
    expect(buildSearchQuery('   ')).toBeNull();
    expect(buildSearchQuery('\t\n')).toBeNull();
  });

  test('searches custom-field values, never keys', () => {
    const built = buildSearchQuery('mint')!;
    expect(built.sql).toContain('json_each.value LIKE ?');
    expect(built.sql).not.toContain('json_each.key');
  });

  test('joins collections for labeling and guards NULL/empty custom_fields', () => {
    const built = buildSearchQuery('mint')!;
    expect(built.sql).toContain('JOIN collections ON collections.id = items.collection_id');
    expect(built.sql).toContain('collections.name AS collection_name');
    expect(built.sql).toContain('collections.vertical AS collection_vertical');
    expect(built.sql).toContain(`items.custom_fields IS NOT NULL AND items.custom_fields != ''`);
    expect(built.sql).toContain('items.notes IS NOT NULL');
  });

  test('binds one escaped LIKE param per branch (name, notes, values, tags)', () => {
    const built = buildSearchQuery('  50%_off  ')!;
    expect(built.params).toEqual([
      '%50\\%\\_off%',
      '%50\\%\\_off%',
      '%50\\%\\_off%',
      '%50\\%\\_off%',
    ]);
    expect(built.sql).toMatch(/LIKE \? ESCAPE '\\'/);
  });

  test('searches tags behind a json_valid guard', () => {
    const built = buildSearchQuery('grail')!;
    expect(built.sql).toContain('json_valid(items.tags)');
    expect(built.sql).toContain('json_each(items.tags)');
  });

  test('selects the first-photo local_uri as thumb_uri via scalar subquery', () => {
    const built = buildSearchQuery('mint')!;
    expect(built.sql).toContain(`${FIRST_PHOTO_URI_SQL} AS thumb_uri`);
    // Scalar subquery, not a join — result stays one row per item.
    expect(FIRST_PHOTO_URI_SQL).toContain('LIMIT 1');
    // Renderable photos outrank newer-but-unfetched ones.
    expect(FIRST_PHOTO_URI_SQL).toContain('(a.local_uri IS NULL), p.created_at DESC');
  });
});

describe('orderByFor', () => {
  test('maps every sort to its exact ORDER BY body', () => {
    const expected: Record<ItemSort, string> = {
      name_asc: 'name COLLATE NOCASE ASC',
      name_desc: 'name COLLATE NOCASE DESC',
      newest: 'created_at DESC',
      oldest: 'created_at ASC',
      value_desc: '(current_value_cents IS NULL), current_value_cents DESC',
      value_asc: '(current_value_cents IS NULL), current_value_cents ASC',
      acquired_desc: '(acquired_at IS NULL), acquired_at DESC',
    };
    for (const [sort, orderBy] of Object.entries(expected)) {
      expect(orderByFor(sort as ItemSort)).toBe(orderBy);
    }
  });

  test('default sort is newest', () => {
    expect(DEFAULT_SORT).toBe('newest');
    expect(orderByFor(DEFAULT_SORT)).toBe('created_at DESC');
  });
});

// The compiler's guarded extract — json_valid keeps ''-valued custom_fields
// rows from blowing up json_extract with "malformed JSON".
const X = (key: string) =>
  `(CASE WHEN json_valid(custom_fields) THEN json_extract(custom_fields, '$.${key}') END)`;

const TAG_CLAUSE =
  `(json_valid(items.tags) AND EXISTS ` +
  `(SELECT 1 FROM json_each(items.tags) WHERE json_each.value = ?))`;

describe('compileFilters', () => {
  test('empty state compiles to nothing', () => {
    expect(compileFilters(DEFS, {})).toEqual({ sql: '', params: [] });
    expect(compileFilters(DEFS, { fields: {}, tags: [] })).toEqual({ sql: '', params: [] });
  });

  test('select compiles to json_extract equality', () => {
    const out = compileFilters(DEFS, { fields: { condition: 'Mint' } });
    expect(out.sql).toBe(`${X('condition')} = ?`);
    expect(out.params).toEqual(['Mint']);
  });

  test('boolean compiles to 1/0 equality', () => {
    expect(compileFilters(DEFS, { fields: { signed: true } })).toEqual({
      sql: `${X('signed')} = ?`,
      params: [1],
    });
    expect(compileFilters(DEFS, { fields: { signed: false } })).toEqual({
      sql: `${X('signed')} = ?`,
      params: [0],
    });
  });

  test('number range compiles both sides', () => {
    const out = compileFilters(DEFS, { fields: { piece_count: { min: 100, max: 500 } } });
    expect(out.sql).toBe(`${X('piece_count')} >= ? AND ${X('piece_count')} <= ?`);
    expect(out.params).toEqual([100, 500]);
  });

  test('number range works one-sided', () => {
    expect(compileFilters(DEFS, { fields: { piece_count: { min: 100 } } })).toEqual({
      sql: `${X('piece_count')} >= ?`,
      params: [100],
    });
    expect(compileFilters(DEFS, { fields: { piece_count: { max: 500 } } })).toEqual({
      sql: `${X('piece_count')} <= ?`,
      params: [500],
    });
  });

  test('empty range compiles to nothing', () => {
    expect(compileFilters(DEFS, { fields: { piece_count: {} } })).toEqual({
      sql: '',
      params: [],
    });
  });

  test('money fields range like numbers', () => {
    const out = compileFilters(DEFS, { fields: { sticker_price: { min: 1999 } } });
    expect(out.sql).toBe(`${X('sticker_price')} >= ?`);
    expect(out.params).toEqual([1999]);
  });

  test('tags compile to json_valid-guarded EXISTS, lowercased, one per tag', () => {
    const out = compileFilters(DEFS, { tags: ['Rare', 'graded'] });
    expect(out.sql).toBe(`${TAG_CLAUSE} AND ${TAG_CLAUSE}`);
    expect(out.params).toEqual(['rare', 'graded']);
  });

  test('clauses compose with AND across field types and tags', () => {
    const out = compileFilters(DEFS, {
      fields: { condition: 'Good', signed: true, piece_count: { min: 10 } },
      tags: ['rare'],
    });
    expect(out.sql).toBe(
      [
        `${X('condition')} = ?`,
        `${X('signed')} = ?`,
        `${X('piece_count')} >= ?`,
        TAG_CLAUSE,
      ].join(' AND ')
    );
    expect(out.params).toEqual(['Good', 1, 10, 'rare']);
  });

  test('text fields and unknown keys are ignored', () => {
    expect(compileFilters(DEFS, { fields: { artist: 'Reid Miles' } })).toEqual({
      sql: '',
      params: [],
    });
    expect(compileFilters(DEFS, { fields: { nope: 'x' } })).toEqual({
      sql: '',
      params: [],
    });
  });

  test('unsafe field key throws instead of riding into the SQL', () => {
    const evil: FieldDef = { key: `x') OR 1=1 --`, label: 'Evil', type: 'select' };
    expect(() => compileFilters([evil], { fields: { [evil.key]: 'x' } })).toThrow(/unsafe/);
  });
});

//*************************************************************************
// Executed against a real db — proves the SQL actually parses and runs
//*************************************************************************

describe('generated SQL runs on a real PowerSync db', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  const insertItem = async (
    id: string,
    collectionId: string,
    name: string,
    notes: string | null,
    customFields: string | null
  ) => {
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, notes, custom_fields, created_at)
       VALUES (?, 'u1', ?, ?, ?, ?, datetime('now'))`,
      [id, collectionId, name, notes, customFields]
    );
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-query-test-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();

    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c1', 'u1', 'My Vinyl', 'vinyl', datetime('now'))`
    );
    await insertItem('i1', 'c1', 'Blue Train', 'hard bop classic', '{"condition": "Mint"}');
    await insertItem('i2', 'c1', '100% Genuine Bootleg', null, null);
    await insertItem('i3', 'c1', '100 percent legit', null, '');
    await insertItem('i4', 'c1', 'Mystery record', null, '{"condition": "Poor", "signed": true, "piece_count": 250}');
  });

  afterAll(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const search = async (q: string) => {
    const built = buildSearchQuery(q)!;
    return db.getAll<any>(built.sql, built.params);
  };

  test('search hits name, notes, and custom-field values with labels', async () => {
    const byName = await search('blue tra');
    expect(byName.map((r) => r.id)).toEqual(['i1']);
    expect(byName[0].collection_name).toBe('My Vinyl');
    expect(byName[0].collection_vertical).toBe('vinyl');

    expect((await search('hard bop')).map((r) => r.id)).toEqual(['i1']);
    expect((await search('mint')).map((r) => r.id)).toEqual(['i1']);
  });

  test('search matches values, not keys', async () => {
    // "condition" is a key on i1 and i4 — must not match anything.
    expect(await search('condition')).toEqual([]);
  });

  test('LIKE wildcards in input are literal', async () => {
    // "%" must not act as a wildcard: only the literal "100%" item hits.
    expect((await search('100%')).map((r) => r.id)).toEqual(['i2']);
  });

  test('search finds items by tag; empty-string tags never crash', async () => {
    await db.execute(`UPDATE items SET tags = '["grail","first pressing"]' WHERE id = 'i1'`);
    await db.execute(`UPDATE items SET tags = '' WHERE id = 'i2'`);

    expect((await search('grail')).map((r) => r.id)).toEqual(['i1']);
    expect((await search('first press')).map((r) => r.id)).toEqual(['i1']);
    // i2's empty-string tags must be skipped by the json_valid guard, not throw.
    expect(await search('zzz-no-match')).toEqual([]);
  });

  test('filter fragments execute: select, boolean, range, composed', async () => {
    const run = async (state: Parameters<typeof compileFilters>[1]) => {
      const { sql, params } = compileFilters(DEFS, state);
      const rows = await db.getAll<any>(
        `SELECT * FROM items WHERE collection_id = ? AND (${sql})`,
        ['c1', ...params]
      );
      return rows.map((r) => r.id);
    };

    expect(await run({ fields: { condition: 'Mint' } })).toEqual(['i1']);
    expect(await run({ fields: { signed: true } })).toEqual(['i4']);
    expect(await run({ fields: { piece_count: { min: 100, max: 500 } } })).toEqual(['i4']);
    expect(await run({ fields: { condition: 'Poor', piece_count: { min: 100 } } })).toEqual(['i4']);
    expect(await run({ fields: { condition: 'Poor', piece_count: { max: 100 } } })).toEqual([]);
  });

  test('every sort compiles to ORDER BY SQLite accepts', async () => {
    const sorts: ItemSort[] = [
      'name_asc',
      'name_desc',
      'newest',
      'oldest',
      'value_desc',
      'value_asc',
      'acquired_desc',
    ];
    for (const sort of sorts) {
      const rows = await db.getAll<any>(
        `SELECT id FROM items ORDER BY ${orderByFor(sort)}`
      );
      expect(rows).toHaveLength(4);
    }
  });

  test('name sorts are case-insensitive and NULL values land last', async () => {
    await db.execute(`UPDATE items SET current_value_cents = 500 WHERE id = 'i1'`);
    await db.execute(`UPDATE items SET current_value_cents = 100 WHERE id = 'i4'`);

    const desc = await db.getAll<any>(
      `SELECT id FROM items ORDER BY ${orderByFor('value_desc')}`
    );
    expect(desc.map((r) => r.id).slice(0, 2)).toEqual(['i1', 'i4']);

    const asc = await db.getAll<any>(
      `SELECT id FROM items ORDER BY ${orderByFor('value_asc')}`
    );
    expect(asc.map((r) => r.id).slice(0, 2)).toEqual(['i4', 'i1']);
    // NULLs trail in both directions.
    expect(new Set(asc.slice(2).map((r) => r.id))).toEqual(new Set(['i2', 'i3']));
    expect(new Set(desc.slice(2).map((r) => r.id))).toEqual(new Set(['i2', 'i3']));
  });

  test('search rows carry thumb_uri from the first renderable photo — one row per item', async () => {
    // Two photos on i1: the newest has no attachment/local_uri yet (still in
    // flight), the older one is renderable — thumb_uri falls back to it.
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('p_old', 'u1', 'i1', '2026-08-01')`
    );
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('p_new', 'u1', 'i1', '2026-08-02')`
    );
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('p_old', 'p_old.jpg', 'file:///photos/p_old.jpg', 3, 1)`
    );

    const rows = await search('blue tra');
    // Scalar subquery must not fan the item out into one row per photo.
    expect(rows).toHaveLength(1);
    expect(rows[0].thumb_uri).toBe('file:///photos/p_old.jpg');
  });

  test('newest photo wins once it becomes renderable', async () => {
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('p_new', 'p_new.jpg', 'file:///photos/p_new.jpg', 3, 1)`
    );
    const rows = await search('blue tra');
    expect(rows[0].thumb_uri).toBe('file:///photos/p_new.jpg');
  });

  test('items without photos search with a NULL thumb_uri', async () => {
    const rows = await search('100%');
    expect(rows).toHaveLength(1);
    expect(rows[0].thumb_uri).toBeNull();
  });
});
