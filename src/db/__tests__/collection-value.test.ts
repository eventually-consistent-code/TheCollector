/**
 * Purpose: Collection-header rollup tests — one collection's value/cost/count
 * SUM, executed against a real PowerSync SQLite db (@powersync/node) to
 * prove the SQL actually runs: cross-collection isolation, NULL cents
 * summed as-if absent, and the zero-row (empty/unknown collection) shape.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import { COLLECTION_VALUE_TOTALS_SQL } from '../query';
import { AppSchema } from '../schema';

describe('collection value rollup SQL on a real PowerSync db', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  const insertCollection = async (id: string, name: string) => {
    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES (?, 'u1', ?, 'trading_cards', datetime('now'))`,
      [id, name]
    );
  };

  const insertItem = async (
    id: string,
    collectionId: string,
    valueCents: number | null,
    priceCents: number | null
  ) => {
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, current_value_cents,
         purchase_price_cents, created_at)
       VALUES (?, 'u1', ?, ?, ?, ?, datetime('now'))`,
      [id, collectionId, `Item ${id}`, valueCents, priceCents]
    );
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-collection-value-test-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();

    // Two populated collections so the WHERE actually isolates, plus one
    // that never gets an item for the zero-row shape.
    await insertCollection('c1', 'Cards A');
    await insertCollection('c2', 'Cards B');
    await insertCollection('c3', 'Empty Shelf');

    // c1: values 500 + 1200, costs 300 + NULL, and one fully-NULL row.
    await insertItem('i1', 'c1', 500, 300);
    await insertItem('i2', 'c1', 1200, null);
    await insertItem('i3', 'c1', null, null);
    // c2: its own money — must never bleed into c1's sums.
    await insertItem('i4', 'c2', 9000, 8000);
  });

  afterAll(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('sums one collection only — the neighbor stays out', async () => {
    const rows = await db.getAll<any>(COLLECTION_VALUE_TOTALS_SQL, ['c1']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ value_cents: 1700, cost_cents: 300, n: 3 });

    const other = await db.getAll<any>(COLLECTION_VALUE_TOTALS_SQL, ['c2']);
    expect(other[0]).toEqual({ value_cents: 9000, cost_cents: 8000, n: 1 });
  });

  test('NULL cents sum as-if absent, never poisoning the total to NULL', async () => {
    // c1 carries a NULL-value row and two NULL-cost rows; sums stay numeric.
    const rows = await db.getAll<any>(COLLECTION_VALUE_TOTALS_SQL, ['c1']);
    expect(rows[0].value_cents).toBe(1700);
    expect(rows[0].cost_cents).toBe(300);
  });

  test('zero rows: empty collection comes back 0/0/0, not NULL', async () => {
    const rows = await db.getAll<any>(COLLECTION_VALUE_TOTALS_SQL, ['c3']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ value_cents: 0, cost_cents: 0, n: 0 });

    // Same shape for an id that does not exist at all.
    const ghost = await db.getAll<any>(COLLECTION_VALUE_TOTALS_SQL, ['nope']);
    expect(ghost[0]).toEqual({ value_cents: 0, cost_cents: 0, n: 0 });
  });
});
