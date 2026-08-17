/**
 * Purpose: Data-layer tests — schema + CRUD run against a real PowerSync
 * SQLite db (@powersync/node, temp file per run). Same code path the app
 * uses on device.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import {
  createCollection,
  createItem,
  deleteCollection,
  deleteItem,
  listValueHistory,
  normalizeTags,
  parseCustomFields,
  parseTags,
  renameCollection,
  updateItem,
} from '../crud';
import { AppSchema } from '../schema';

// expo-crypto is native; tests get Node's crypto instead.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

const U1 = 'user-one-uuid';

let db: PowerSyncDatabase;
let dir: string;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-test-'));
  db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db',
      dbLocation: dir,
      readWorkerCount: 1,
    },
  });
  await db.init();
});

afterEach(async () => {
  await db.disconnectAndClear();
  await db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('collections', () => {
  test('create and read back', async () => {
    const id = await createCollection(db, { name: 'My Vinyl', vertical: 'vinyl', userId: U1 });

    const rows = await db.getAll<any>('SELECT * FROM collections');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
    expect(rows[0].name).toBe('My Vinyl');
    expect(rows[0].vertical).toBe('vinyl');
    expect(rows[0].created_at).toBeTruthy();
  });

  test('rename updates name and updated_at only', async () => {
    const id = await createCollection(db, { name: 'Old', vertical: 'comics', userId: U1 });
    await renameCollection(db, id, 'New');

    const row = await db.get<any>('SELECT * FROM collections WHERE id = ?', [id]);
    expect(row.name).toBe('New');
    expect(row.vertical).toBe('comics');
  });

  test('delete cascades items', async () => {
    const keepId = await createCollection(db, { name: 'Keep', vertical: 'lego', userId: U1 });
    const dropId = await createCollection(db, { name: 'Drop', vertical: 'funko', userId: U1 });
    await createItem(db, keepId, { name: 'Kept item' }, U1);
    await createItem(db, dropId, { name: 'Doomed 1' }, U1);
    await createItem(db, dropId, { name: 'Doomed 2' }, U1);

    await deleteCollection(db, dropId);

    const collections = await db.getAll('SELECT id FROM collections');
    const items = await db.getAll<any>('SELECT * FROM items');
    expect(collections).toHaveLength(1);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Kept item');
  });
});

describe('items', () => {
  let collectionId: string;

  beforeEach(async () => {
    collectionId = await createCollection(db, { name: 'Games', vertical: 'video-games', userId: U1 });
  });

  test('create with full fields round-trips', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Chrono Trigger',
      notes: 'CIB, minor shelf wear',
      acquiredAt: '2025-12-25',
      purchasePriceCents: 24999,
      currentValueCents: 32000,
      customFields: { platform: 'SNES', region: 'NTSC-U' },
    }, U1);

    const row = await db.get<any>('SELECT * FROM items WHERE id = ?', [id]);
    expect(row.collection_id).toBe(collectionId);
    expect(row.purchase_price_cents).toBe(24999);
    expect(row.current_value_cents).toBe(32000);
    expect(parseCustomFields(row.custom_fields)).toEqual({
      platform: 'SNES',
      region: 'NTSC-U',
    });
  });

  test('optional fields default to null', async () => {
    const id = await createItem(db, collectionId, { name: 'Loose cart' }, U1);

    const row = await db.get<any>('SELECT * FROM items WHERE id = ?', [id]);
    expect(row.notes).toBeNull();
    expect(row.acquired_at).toBeNull();
    expect(row.purchase_price_cents).toBeNull();
    expect(row.custom_fields).toBeNull();
  });

  test('update overwrites fields', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Earthbound',
      purchasePriceCents: 10000,
    }, U1);
    await updateItem(db, id, { name: 'EarthBound', currentValueCents: 45000 });

    const row = await db.get<any>('SELECT * FROM items WHERE id = ?', [id]);
    expect(row.name).toBe('EarthBound');
    expect(row.current_value_cents).toBe(45000);
    // update writes the full field set — cleared fields go null.
    expect(row.purchase_price_cents).toBeNull();
  });

  test('delete removes only that item', async () => {
    const a = await createItem(db, collectionId, { name: 'A' }, U1);
    await createItem(db, collectionId, { name: 'B' }, U1);

    await deleteItem(db, a);

    const rows = await db.getAll<any>('SELECT name FROM items');
    expect(rows.map((r) => r.name)).toEqual(['B']);
  });

  test('collection_id index exists for item lookups', async () => {
    const indexes = await db.getAll<any>(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%collection%'`
    );
    expect(indexes.length).toBeGreaterThan(0);
  });
});

describe('parseCustomFields', () => {
  test.each([
    [null, {}],
    ['', {}],
    ['not json', {}],
    ['[1,2]', {}],
    ['{"grade":"9.8"}', { grade: '9.8' }],
  ])('%p → %p', (raw, expected) => {
    expect(parseCustomFields(raw as string | null)).toEqual(expected);
  });
});

describe('custom_fields round-trip (template values)', () => {
  test('mixed types survive create and update', async () => {
    const cid = await createCollection(db, { name: 'Vinyl', vertical: 'vinyl', userId: U1 });
    const values = {
      artist: 'Pink Floyd',
      release_year: 1973,
      media_condition: 'NM',
      sleeve_condition: 'VG+',
      store_pick: true,
    };
    const id = await createItem(db, cid, { name: 'DSOTM', customFields: values }, U1);

    let row = await db.get<any>('SELECT custom_fields FROM items WHERE id = ?', [id]);
    expect(parseCustomFields(row.custom_fields)).toEqual(values);

    await updateItem(db, id, { name: 'DSOTM', customFields: { artist: 'Pink Floyd' } });
    row = await db.get<any>('SELECT custom_fields FROM items WHERE id = ?', [id]);
    expect(parseCustomFields(row.custom_fields)).toEqual({ artist: 'Pink Floyd' });
  });

  test('phase 5.5 verticals ride the same opaque JSON path', async () => {
    // The db layer never learns the new verticals exist — that's the point.
    const cid = await createCollection(db, { name: 'Watches', vertical: 'timepieces', userId: U1 });
    const values = {
      brand: 'Omega',
      reference_number: '311.30.42.30.01.005',
      movement: 'Manual Wind',
      case_diameter_mm: 42,
      has_box: true,
      has_papers: false,
    };
    const id = await createItem(db, cid, { name: 'Speedmaster Professional', customFields: values }, U1);

    const row = await db.get<any>('SELECT custom_fields FROM items WHERE id = ?', [id]);
    expect(parseCustomFields(row.custom_fields)).toEqual(values);
  });
});

describe('tags', () => {
  let collectionId: string;

  beforeEach(async () => {
    collectionId = await createCollection(db, { name: 'Comics', vertical: 'comics', userId: U1 });
  });

  test('create with tags round-trips normalized', async () => {
    const id = await createItem(db, collectionId, {
      name: 'ASM #300',
      // Messy on purpose — normalization happens on the way in.
      tags: ['  Key Issue ', 'venom', 'VENOM', '', 'graded'],
    }, U1);

    const row = await db.get<any>('SELECT tags FROM items WHERE id = ?', [id]);
    expect(parseTags(row.tags)).toEqual(['key issue', 'venom', 'graded']);
  });

  test('update overwrites tags; omitting them clears to null', async () => {
    const id = await createItem(db, collectionId, { name: 'Hulk #181', tags: ['key'] }, U1);

    await updateItem(db, id, { name: 'Hulk #181', tags: ['wolverine', 'key'] });
    let row = await db.get<any>('SELECT tags FROM items WHERE id = ?', [id]);
    expect(parseTags(row.tags)).toEqual(['wolverine', 'key']);

    // update writes the full field set — cleared tags go null, like the rest.
    await updateItem(db, id, { name: 'Hulk #181' });
    row = await db.get<any>('SELECT tags FROM items WHERE id = ?', [id]);
    expect(row.tags).toBeNull();
    expect(parseTags(row.tags)).toEqual([]);
  });

  test('old rows without tags parse to empty array', async () => {
    const id = await createItem(db, collectionId, { name: 'Pre-tags item' }, U1);

    const row = await db.get<any>('SELECT tags FROM items WHERE id = ?', [id]);
    expect(row.tags).toBeNull();
    expect(parseTags(row.tags)).toEqual([]);
  });
});

describe('parseTags', () => {
  test.each([
    [null, []],
    ['', []],
    ['not json', []],
    ['{"a":1}', []],
    ['[1,"vinyl",null]', ['vinyl']],
    ['["vinyl","rare"]', ['vinyl', 'rare']],
  ])('%p → %p', (raw, expected) => {
    expect(parseTags(raw as string | null)).toEqual(expected);
  });
});

describe('value history', () => {
  let collectionId: string;

  beforeEach(async () => {
    collectionId = await createCollection(db, { name: 'Cards', vertical: 'trading-cards', userId: U1 });
  });

  test('create with a value appends the first history row', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Charizard Base Set',
      currentValueCents: 250000,
    }, U1);

    const rows = await listValueHistory(db, id);
    expect(rows).toHaveLength(1);
    expect(rows[0].item_id).toBe(id);
    expect(rows[0].value_cents).toBe(250000);
    expect(rows[0].recorded_at).toBeTruthy();
    // No valueSource given — the collector typed it.
    expect(rows[0].source).toBe('manual');

    const raw = await db.get<any>('SELECT user_id FROM item_value_history WHERE item_id = ?', [id]);
    expect(raw.user_id).toBe(U1);
  });

  test('create without a value appends nothing', async () => {
    const id = await createItem(db, collectionId, { name: 'Raw common' }, U1);

    expect(await listValueHistory(db, id)).toHaveLength(0);
  });

  test('value change on update appends; valueSource rides along', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Pikachu Illustrator',
      currentValueCents: 100,
    }, U1);
    // ms-precision timestamps — a beat between writes keeps order stable.
    await new Promise((r) => setTimeout(r, 2));
    await updateItem(db, id, {
      name: 'Pikachu Illustrator',
      currentValueCents: 200,
      valueSource: 'cardsight',
    });

    const rows = await listValueHistory(db, id);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.value_cents)).toEqual([100, 200]);
    expect(rows.map((r) => r.source)).toEqual(['manual', 'cardsight']);
  });

  test('same value on update appends nothing', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Blastoise',
      currentValueCents: 5000,
    }, U1);
    await updateItem(db, id, { name: 'Blastoise (holo)', currentValueCents: 5000 });

    expect(await listValueHistory(db, id)).toHaveLength(1);
  });

  test('value-absent update appends nothing', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Venusaur',
      currentValueCents: 4000,
    }, U1);
    // Value omitted — the update clears the column but never fakes a point.
    await updateItem(db, id, { name: 'Venusaur' });

    // Only the create-time row — the clearing update never fakes a point.
    expect(await listValueHistory(db, id)).toHaveLength(1);
    const row = await db.get<any>('SELECT current_value_cents FROM items WHERE id = ?', [id]);
    expect(row.current_value_cents).toBeNull();
  });

  test('legacy rows without history stay untouched and queryable', async () => {
    // Pre-phase-7 shape: no value at create, edits that never touch value.
    const id = await createItem(db, collectionId, { name: 'Old-timer' }, U1);
    await updateItem(db, id, { name: 'Old-timer, renamed' });

    expect(await listValueHistory(db, id)).toEqual([]);
    const row = await db.get<any>('SELECT * FROM items WHERE id = ?', [id]);
    expect(row.name).toBe('Old-timer, renamed');
    expect(row.source).toBeNull();
    expect(row.source_id).toBeNull();
  });

  test('history rows scope to their own item, oldest first', async () => {
    // Tiny gaps so recorded_at (ms precision) never ties — ordering is
    // what this test is about.
    const tick = () => new Promise((r) => setTimeout(r, 2));
    const a = await createItem(db, collectionId, { name: 'A', currentValueCents: 1 }, U1);
    const b = await createItem(db, collectionId, { name: 'B', currentValueCents: 10 }, U1);
    await tick();
    await updateItem(db, a, { name: 'A', currentValueCents: 2 });
    await tick();
    await updateItem(db, a, { name: 'A', currentValueCents: 3 });

    const rowsA = await listValueHistory(db, a);
    const rowsB = await listValueHistory(db, b);
    expect(rowsA.map((r) => r.value_cents)).toEqual([1, 2, 3]);
    expect(rowsB.map((r) => r.value_cents)).toEqual([10]);
  });

  test('item_id index exists for history lookups', async () => {
    const indexes = await db.getAll<any>(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%item_value_history%'`
    );
    expect(indexes.length).toBeGreaterThan(0);
  });
});

describe('metadata source-link', () => {
  let collectionId: string;

  beforeEach(async () => {
    collectionId = await createCollection(db, { name: 'Vinyl', vertical: 'vinyl', userId: U1 });
  });

  test('source and source_id round-trip on create', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Kind of Blue',
      source: 'discogs',
      sourceId: 'r12345',
    }, U1);

    const row = await db.get<any>('SELECT source, source_id FROM items WHERE id = ?', [id]);
    expect(row.source).toBe('discogs');
    expect(row.source_id).toBe('r12345');
  });

  test('manual update leaves the source-link untouched', async () => {
    const id = await createItem(db, collectionId, {
      name: 'Abbey Road',
      source: 'discogs',
      sourceId: 'r67890',
    }, U1);
    // No source in the input — a hand edit must not strip attribution.
    await updateItem(db, id, { name: 'Abbey Road (2019 remaster)' });

    const row = await db.get<any>('SELECT source, source_id FROM items WHERE id = ?', [id]);
    expect(row.source).toBe('discogs');
    expect(row.source_id).toBe('r67890');
  });

  test('provided source on update overwrites', async () => {
    const id = await createItem(db, collectionId, { name: 'Blue Train' }, U1);
    await updateItem(db, id, { name: 'Blue Train', source: 'discogs', sourceId: 'r111' });

    const row = await db.get<any>('SELECT source, source_id FROM items WHERE id = ?', [id]);
    expect(row.source).toBe('discogs');
    expect(row.source_id).toBe('r111');
  });
});

describe('normalizeTags', () => {
  test.each([
    [['  Rare  '], ['rare']],
    [['VINYL', 'vinyl', 'Vinyl'], ['vinyl']],
    [['', '   ', 'ok'], ['ok']],
    [['b', 'a', 'B'], ['b', 'a']],
    [[], []],
  ])('%p → %p', (input, expected) => {
    expect(normalizeTags(input)).toEqual(expected);
  });
});
