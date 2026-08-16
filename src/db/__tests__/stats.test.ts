/**
 * Purpose: Vault totals SQL test — TOTALS_SQL executed against a real
 * PowerSync SQLite db (@powersync/node) to prove the aggregate parses,
 * runs, and counts across every collection.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import { AppSchema } from '../schema';
import { TOTALS_SQL, type TotalsRow } from '../stats';

describe('TOTALS_SQL runs on a real PowerSync db', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-stats-test-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();
  });

  afterAll(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const totals = async (): Promise<TotalsRow> => db.get<TotalsRow>(TOTALS_SQL);

  test('empty vault reads zero across the board', async () => {
    expect(await totals()).toEqual({ collections: 0, items: 0 });
  });

  test('counts span every collection, not just one', async () => {
    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c1', 'u1', 'Cards', 'trading_cards', datetime('now'))`
    );
    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c2', 'u1', 'Comics', 'comics', datetime('now'))`
    );
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, created_at)
       VALUES ('i1', 'u1', 'c1', 'Alpha', datetime('now'))`
    );
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, created_at)
       VALUES ('i2', 'u1', 'c1', 'Bravo', datetime('now'))`
    );
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, created_at)
       VALUES ('i3', 'u1', 'c2', 'Charlie', datetime('now'))`
    );

    expect(await totals()).toEqual({ collections: 2, items: 3 });
  });
});
