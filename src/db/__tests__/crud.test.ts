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
  parseCustomFields,
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
});
