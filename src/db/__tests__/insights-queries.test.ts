/**
 * Purpose: Insights SQL tests against a real PowerSync db (@powersync/node)
 * — top movers require both figures and order by delta with the limit
 * honored, the items baseline SELECT carries the exact columns the series
 * math eats, and the all-history feed comes back oldest first.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import {
  ALL_VALUE_HISTORY_SQL,
  ITEMS_VALUE_BASELINE_SQL,
  TOP_MOVERS_SQL,
} from '../query';
import { AppSchema } from '../schema';

describe('insights SQL on a real PowerSync db', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  const insertItem = async (
    id: string,
    name: string,
    priceCents: number | null,
    valueCents: number | null,
    acquiredAt: string | null = null
  ) => {
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name,
         purchase_price_cents, current_value_cents, acquired_at, created_at)
       VALUES (?, 'u1', 'c1', ?, ?, ?, ?, '2026-01-05T00:00:00.000Z')`,
      [id, name, priceCents, valueCents, acquiredAt]
    );
  };

  const insertHistory = async (
    id: string,
    itemId: string,
    valueCents: number,
    recordedAt: string
  ) => {
    await db.execute(
      `INSERT INTO item_value_history (id, user_id, item_id, value_cents,
         recorded_at, source)
       VALUES (?, 'u1', ?, ?, ?, 'manual')`,
      [id, itemId, valueCents, recordedAt]
    );
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-insights-test-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();

    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c1', 'u1', 'Cards', 'trading_cards', datetime('now'))`
    );

    // Movers field: gains of +900, +500, +100, a loser at -200, and two
    // rows missing a figure that must never rank.
    await insertItem('i1', 'Small Gainer', 1000, 1100, '2026-02-01');
    await insertItem('i2', 'Big Gainer', 1000, 1900);
    await insertItem('i3', 'Mid Gainer', 2000, 2500);
    await insertItem('i4', 'Loser', 1000, 800);
    await insertItem('i5', 'No Value', 1000, null);
    await insertItem('i6', 'No Cost', null, 5000);

    // History rows inserted out of order on purpose.
    await insertHistory('h2', 'i1', 1100, '2026-06-01T00:00:00.000Z');
    await insertHistory('h1', 'i1', 1000, '2026-03-01T00:00:00.000Z');
    await insertHistory('h3', 'i2', 1900, '2026-04-15T00:00:00.000Z');
  });

  afterAll(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('top movers: biggest delta first, three rows max', async () => {
    const rows = await db.getAll<any>(TOP_MOVERS_SQL);
    expect(rows).toHaveLength(3);
    expect(rows.map((r: any) => r.id)).toEqual(['i2', 'i3', 'i1']);
    expect(rows.map((r: any) => r.delta_cents)).toEqual([900, 500, 100]);
  });

  test('top movers: rows missing either figure never rank', async () => {
    const rows = await db.getAll<any>(TOP_MOVERS_SQL);
    const ids = rows.map((r: any) => r.id);
    expect(ids).not.toContain('i5');
    expect(ids).not.toContain('i6');
  });

  test('top movers: thumb column rides along (null without photos)', async () => {
    const rows = await db.getAll<any>(TOP_MOVERS_SQL);
    for (const row of rows) {
      expect(row).toHaveProperty('thumb_uri');
      expect(row.thumb_uri).toBeNull();
    }
  });

  test('baseline: exact column shape the series math consumes', async () => {
    const rows = await db.getAll<any>(ITEMS_VALUE_BASELINE_SQL);
    expect(rows).toHaveLength(6);
    const i1 = rows.find((r: any) => r.id === 'i1');
    expect(i1).toEqual({
      id: 'i1',
      purchase_price_cents: 1000,
      current_value_cents: 1100,
      acquired_at: '2026-02-01',
      created_at: '2026-01-05T00:00:00.000Z',
    });
    // NULL money columns come through as null, not 0.
    const i6 = rows.find((r: any) => r.id === 'i6');
    expect(i6.purchase_price_cents).toBeNull();
  });

  test('all-history feed: oldest first across items', async () => {
    const rows = await db.getAll<any>(ALL_VALUE_HISTORY_SQL);
    expect(rows).toHaveLength(3);
    expect(rows.map((r: any) => r.recorded_at)).toEqual([
      '2026-03-01T00:00:00.000Z',
      '2026-04-15T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    ]);
    expect(rows[0]).toEqual({
      item_id: 'i1',
      value_cents: 1000,
      recorded_at: '2026-03-01T00:00:00.000Z',
    });
  });
});
