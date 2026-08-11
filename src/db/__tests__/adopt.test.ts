/**
 * Purpose: Adopt-on-first-login tests — ownerless rows get claimed, owned
 * rows stay put.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import { adoptLocalData } from '../adopt';
import { createCollection, createItem } from '../crud';
import { AppSchema } from '../schema';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

const OWNER = 'existing-owner';
const NEWBIE = 'new-user';

let db: PowerSyncDatabase;
let dir: string;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-adopt-'));
  db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
  });
  await db.init();
});

afterEach(async () => {
  await db.disconnectAndClear();
  await db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('claims ownerless rows, leaves owned rows alone', async () => {
  // Phase-1-style ownerless rows (inserted without user_id).
  await db.execute(
    `INSERT INTO collections (id, name, vertical, created_at, updated_at)
     VALUES ('c-old', 'Pre-auth', 'vinyl', '2026-01-01', '2026-01-01')`
  );
  await db.execute(
    `INSERT INTO items (id, collection_id, name, created_at, updated_at)
     VALUES ('i-old', 'c-old', 'Old item', '2026-01-01', '2026-01-01')`
  );
  // A row that already has an owner.
  const ownedId = await createCollection(db, {
    name: 'Owned',
    vertical: 'lego',
    userId: OWNER,
  });
  await createItem(db, ownedId, { name: 'Owned item' }, OWNER);

  const counts = await adoptLocalData(db, NEWBIE);

  expect(counts).toEqual({ collections: 1, items: 1 });
  const oldCol = await db.get<any>(`SELECT user_id FROM collections WHERE id = 'c-old'`);
  const oldItem = await db.get<any>(`SELECT user_id FROM items WHERE id = 'i-old'`);
  const owned = await db.get<any>(`SELECT user_id FROM collections WHERE id = ?`, [ownedId]);
  expect(oldCol.user_id).toBe(NEWBIE);
  expect(oldItem.user_id).toBe(NEWBIE);
  expect(owned.user_id).toBe(OWNER);
});

test('no-op when nothing to adopt', async () => {
  const counts = await adoptLocalData(db, NEWBIE);
  expect(counts).toEqual({ collections: 0, items: 0 });
});
