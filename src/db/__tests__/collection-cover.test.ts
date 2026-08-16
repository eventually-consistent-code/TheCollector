/**
 * Purpose: Collection cover-art tests — COLLECTION_COVER_URI_SQL against
 * real SQLite. The Vault's cards each lead with the collection's newest
 * renderable photo; these prove the correlated subquery lands the right
 * uri on the right collection and prefers photos that can actually render.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import { COLLECTION_COVER_URI_SQL } from '../query';
import { AppSchema } from '../schema';

// Mirrors the Vault screen's collections query shape.
const COVER_QUERY =
  `SELECT collections.id, ${COLLECTION_COVER_URI_SQL} AS cover_uri ` +
  `FROM collections ORDER BY collections.created_at DESC`;

interface CoverRow {
  id: string;
  cover_uri: string | null;
}

describe('COLLECTION_COVER_URI_SQL', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-cover-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();

    // Two collections, one item each — newest collection first in the list.
    await db.execute(
      `INSERT INTO collections (id, user_id, name, vertical, created_at)
       VALUES ('c1', 'u1', 'Comics', 'comics', '2026-08-01'),
              ('c2', 'u1', 'Coins', 'coins', '2026-08-02')`
    );
    await db.execute(
      `INSERT INTO items (id, user_id, collection_id, name, created_at)
       VALUES ('i1', 'u1', 'c1', 'Action #1', '2026-08-03'),
              ('i2', 'u1', 'c2', 'Denarius', '2026-08-03')`
    );
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('photo lands on its own collection; the other stays null', async () => {
    // One photo, on c1's item, with bytes on disk.
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('p1', 'u1', 'i1', '2026-08-04')`
    );
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('p1', 'p1.jpg', 'file:///photos/p1.jpg', 3, 1)`
    );

    const rows = await db.getAll<CoverRow>(COVER_QUERY);
    expect(rows).toHaveLength(2);

    const c1 = rows.find((r) => r.id === 'c1');
    const c2 = rows.find((r) => r.id === 'c2');
    expect(c1?.cover_uri).toBe('file:///photos/p1.jpg');
    expect(c2?.cover_uri).toBeNull();
  });

  test('renderable photo outranks a newer one without local bytes', async () => {
    // Newest photo's attachment hasn't downloaded yet (no local_uri, and
    // no attachment row at all is the same story) — the older photo with
    // real bytes should win the cover, not a blank.
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('p-old', 'u1', 'i1', '2026-08-04'),
              ('p-new', 'u1', 'i1', '2026-08-05')`
    );
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('p-old', 'p-old.jpg', 'file:///photos/p-old.jpg', 3, 1),
              ('p-new', 'p-new.jpg', NULL, 1, 2)`
    );

    const rows = await db.getAll<CoverRow>(COVER_QUERY);
    const c1 = rows.find((r) => r.id === 'c1');
    expect(c1?.cover_uri).toBe('file:///photos/p-old.jpg');
  });

  test('newest renderable photo wins across the collection\'s items', async () => {
    // Two renderable photos on c1 — newer one takes the cover.
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('p-a', 'u1', 'i1', '2026-08-04'),
              ('p-b', 'u1', 'i1', '2026-08-06')`
    );
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('p-a', 'p-a.jpg', 'file:///photos/p-a.jpg', 3, 1),
              ('p-b', 'p-b.jpg', 'file:///photos/p-b.jpg', 3, 2)`
    );

    const rows = await db.getAll<CoverRow>(COVER_QUERY);
    const c1 = rows.find((r) => r.id === 'c1');
    expect(c1?.cover_uri).toBe('file:///photos/p-b.jpg');
  });
});
