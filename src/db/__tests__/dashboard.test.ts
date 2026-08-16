/**
 * Purpose: Dashboard rollup tests — portfolio totals, per-vertical
 * breakdown, and the recently-cataloged rail, executed against a real
 * PowerSync SQLite db (@powersync/node) to prove the SQL actually runs.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import {
  DASHBOARD_TOTALS_SQL,
  VERTICAL_BREAKDOWN_SQL,
  RECENT_ITEMS_SQL,
} from '../query';
import { AppSchema } from '../schema';

describe('dashboard rollup SQL on a real PowerSync db', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  const insertCollection = async (id: string, name: string, vertical: string) => {
    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES (?, 'u1', ?, ?, datetime('now'))`,
      [id, name, vertical]
    );
  };

  const insertItem = async (
    id: string,
    collectionId: string,
    name: string,
    valueCents: number | null,
    createdAt: string
  ) => {
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, current_value_cents, created_at)
       VALUES (?, 'u1', ?, ?, ?, ?)`,
      [id, collectionId, name, valueCents, createdAt]
    );
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-dashboard-test-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();

    // Three verticals — two collections share trading_cards, one vinyl,
    // and one bourbon collection that never gets an item.
    await insertCollection('c1', 'Cards A', 'trading_cards');
    await insertCollection('c2', 'Cards B', 'trading_cards');
    await insertCollection('c3', 'Records', 'vinyl');
    await insertCollection('c4', 'Empty Shelf', 'bourbon');

    // Distinct created_at values so recency ordering is unambiguous.
    await insertItem('i1', 'c1', 'Alpha', 500, '2026-08-01T00:00:00Z');
    await insertItem('i2', 'c1', 'Bravo', null, '2026-08-02T00:00:00Z');
    await insertItem('i3', 'c2', 'Charlie', 250, '2026-08-03T00:00:00Z');
    await insertItem('i4', 'c3', 'Delta', 9000, '2026-08-04T00:00:00Z');
    await insertItem('i5', 'c3', 'Echo', 100, '2026-08-05T00:00:00Z');
    await insertItem('i6', 'c3', 'Foxtrot', null, '2026-08-06T00:00:00Z');
  });

  afterAll(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('totals: one row counting every item, NULL values summed as-if absent', async () => {
    const rows = await db.getAll<any>(DASHBOARD_TOTALS_SQL);
    expect(rows).toHaveLength(1);
    expect(rows[0].item_count).toBe(6);
    expect(rows[0].total_value_cents).toBe(9850);
  });

  test('breakdown: one row per vertical, richest first, empty vertical at 0', async () => {
    const rows = await db.getAll<any>(VERTICAL_BREAKDOWN_SQL);
    expect(rows).toEqual([
      { vertical: 'vinyl', item_count: 3, value_cents: 9100 },
      { vertical: 'trading_cards', item_count: 3, value_cents: 750 },
      { vertical: 'bourbon', item_count: 0, value_cents: 0 },
    ]);
  });

  test('recent items: newest first, honors the limit param', async () => {
    const rows = await db.getAll<any>(RECENT_ITEMS_SQL, [5]);
    expect(rows.map((r) => r.id)).toEqual(['i6', 'i5', 'i4', 'i3', 'i2']);

    const three = await db.getAll<any>(RECENT_ITEMS_SQL, [3]);
    expect(three.map((r) => r.id)).toEqual(['i6', 'i5', 'i4']);
  });

  test('recent items carry thumb_uri from the first renderable photo', async () => {
    // Renderable photo on i6; photo with no local_uri yet on i5 — that row
    // must stay NULL rather than showing a blank frame.
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('ph1', 'u1', 'i6', '2026-08-06')`
    );
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('ph1', 'ph1.jpg', 'file:///photos/ph1.jpg', 3, 1)`
    );
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('ph2', 'u1', 'i5', '2026-08-06')`
    );

    const rows = await db.getAll<any>(RECENT_ITEMS_SQL, [2]);
    expect(rows.map((r) => r.id)).toEqual(['i6', 'i5']);
    expect(rows[0].thumb_uri).toBe('file:///photos/ph1.jpg');
    expect(rows[1].thumb_uri).toBeNull();
  });
});
