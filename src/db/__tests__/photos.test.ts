/**
 * Purpose: Photo system tests — object naming, retry decisions, and the
 * photos table + attachment-join query shape against real SQLite.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PowerSyncDatabase } from '@powersync/node';

import { photoObjectName, shouldRetryDownload } from '../photos';
import { AppSchema } from '../schema';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

// photos.ts pulls in the supabase client (AsyncStorage native module) —
// these tests never touch storage, so stub the client out.
jest.mock('@/auth/client', () => ({ supabase: { storage: {} } }));

describe('photoObjectName', () => {
  test('derives flat jpg name from id', () => {
    expect(photoObjectName('abc-123')).toBe('abc-123.jpg');
  });
});

describe('shouldRetryDownload', () => {
  test.each([
    [{ message: 'StorageApiError: Object not found' }, false],
    [{ message: 'The resource was not found' }, false],
    [{ message: 'status 404' }, false],
    [{ message: 'network request failed' }, true],
    [{ message: 'timeout' }, true],
  ])('%p → retry=%p', (error, expected) => {
    expect(shouldRetryDownload(error)).toBe(expected);
  });
});

describe('photos table', () => {
  let db: PowerSyncDatabase;
  let dir: string;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-photos-'));
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

  test('photos row + attachment join returns local state', async () => {
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, media_type, created_at)
       VALUES ('p1', 'u1', 'i1', 'image/jpeg', '2026-08-13')`
    );
    // Simulate queue-managed attachment row alongside.
    await db.execute(
      `INSERT INTO attachments (id, filename, local_uri, state, timestamp)
       VALUES ('p1', 'p1.jpg', 'file:///photos/p1.jpg', 3, 1)`
    );

    const rows = await db.getAll<any>(
      `SELECT p.id, a.local_uri, a.state
       FROM photos p LEFT JOIN attachments a ON a.id = p.id
       WHERE p.item_id = 'i1' ORDER BY p.created_at DESC`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].local_uri).toBe('file:///photos/p1.jpg');
    expect(rows[0].state).toBe(3);
  });

  test('photo without attachment row still lists (pending state)', async () => {
    await db.execute(
      `INSERT INTO photos (id, user_id, item_id, created_at)
       VALUES ('p2', 'u1', 'i1', '2026-08-13')`
    );
    const rows = await db.getAll<any>(
      `SELECT p.id, a.local_uri FROM photos p
       LEFT JOIN attachments a ON a.id = p.id WHERE p.item_id = 'i1'`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].local_uri).toBeNull();
  });
});
