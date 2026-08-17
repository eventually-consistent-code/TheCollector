/**
 * Purpose: Offline image backfill tests — the candidate query against a real
 * PowerSync db (zero-photo + criteria + cap + ordering), the title-match
 * guard's pure cases, and the sweep's attempt order / pending-clear
 * semantics with everything mocked.
 * Author(s): John Reed
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { AbstractPowerSyncDatabase } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/node';

import { createCollection } from '../crud';
import {
  listBackfillCandidates,
  normalizeTitle,
  sweepMissingImages,
  titlesMatch,
  type BackfillCandidate,
} from '../image-backfill';
import type { SaveLookupImageDeps } from '../lookup-image';
import { AppSchema } from '../schema';

// expo-crypto is native; tests get Node's crypto instead.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

// The sweeper's import chain reaches the supabase client and the adapter
// registry — both mocked out; every test injects its own deps.
jest.mock('@/auth/client', () => ({ supabase: { storage: {}, functions: {} } }));
jest.mock('@/metadata', () => ({ getAdapter: jest.fn() }));

const U1 = 'user-one-uuid';

// Raw item insert — the candidate tests need precise control over
// created_at, empty names, and null columns that createItem normalizes.
async function insertItem(
  db: AbstractPowerSyncDatabase,
  fields: {
    id: string;
    collectionId: string;
    name?: string;
    pending?: string | null;
    source?: string | null;
    sourceId?: string | null;
    createdAt?: string;
  }
): Promise<void> {
  await db.execute(
    `INSERT INTO items
       (id, user_id, collection_id, name, pending_image_url, source, source_id,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fields.id,
      U1,
      fields.collectionId,
      fields.name ?? 'Item',
      fields.pending ?? null,
      fields.source ?? null,
      fields.sourceId ?? null,
      fields.createdAt ?? '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]
  );
}

async function insertPhoto(db: AbstractPowerSyncDatabase, itemId: string): Promise<void> {
  await db.execute(
    `INSERT INTO photos (id, user_id, item_id, media_type, created_at)
     VALUES (?, ?, ?, 'image/jpeg', ?)`,
    [require('crypto').randomUUID(), U1, itemId, '2026-01-01T00:00:00.000Z']
  );
}

describe('listBackfillCandidates (real db)', () => {
  let db: PowerSyncDatabase;
  let dir: string;
  let collectionId: string;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thecollector-backfill-'));
    db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.db', dbLocation: dir, readWorkerCount: 1 },
    });
    await db.init();
    collectionId = await createCollection(db, { name: 'Vinyl', vertical: 'vinyl', userId: U1 });
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('only photo-less items with a lead qualify, vertical rides the join', async () => {
    // Has a photo — settled, excluded.
    await insertItem(db, { id: 'i-photo', collectionId, pending: 'https://x/a.jpg' });
    await insertPhoto(db, 'i-photo');
    // No photo, no lead at all (empty name, no pending, no source_id).
    await insertItem(db, { id: 'i-blank', collectionId, name: '' });
    // No photo + pending url — in.
    await insertItem(db, { id: 'i-pending', collectionId, name: '', pending: 'https://x/b.jpg' });
    // No photo + source link — in.
    await insertItem(db, { id: 'i-source', collectionId, name: '', source: 'CardSight', sourceId: 'c1' });
    // No photo + just a name — in (attempt (c) material).
    await insertItem(db, { id: 'i-name', collectionId, name: 'Abbey Road' });

    const rows = await listBackfillCandidates(db);
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(['i-name', 'i-pending', 'i-source']);
    expect(rows[0].vertical).toBe('vinyl');
    expect(rows[0].user_id).toBe(U1);
  });

  test('oldest first, capped at 10', async () => {
    // Twelve eligible items, newest inserted first — only the ten oldest
    // come back, oldest leading.
    for (let i = 11; i >= 0; i--) {
      await insertItem(db, {
        id: `i-${String(i).padStart(2, '0')}`,
        collectionId,
        name: `Item ${i}`,
        createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      });
    }

    const rows = await listBackfillCandidates(db);
    expect(rows).toHaveLength(10);
    expect(rows[0].id).toBe('i-00');
    expect(rows[9].id).toBe('i-09');
  });

  test('created_at ties break on id for a stable order', async () => {
    await insertItem(db, { id: 'i-b', collectionId, name: 'B' });
    await insertItem(db, { id: 'i-a', collectionId, name: 'A' });

    const rows = await listBackfillCandidates(db);
    expect(rows.map((r) => r.id)).toEqual(['i-a', 'i-b']);
  });
});

describe('normalizeTitle / titlesMatch', () => {
  test.each([
    ['Spider-Man #1', 'spiderman1'],
    ['  The  Hobbit  ', 'thehobbit'],
    ['ABBEY ROAD', 'abbeyroad'],
    ['!!!', ''],
  ])('%p → %p', (input, expected) => {
    expect(normalizeTitle(input)).toBe(expected);
  });

  test.each([
    ['Abbey Road', 'abbey road!', true], // exact after normalizing
    ['The Hobbit', 'The Hobbit: Deluxe Edition', true], // startsWith forward
    ['The Hobbit: Deluxe Edition', 'The Hobbit', true], // startsWith reverse
    ['Abbey Road', 'Let It Be', false],
    ['', 'Anything', false], // empty never matches
    ['!!!', 'Anything', false], // punctuation-only never matches
  ])('titlesMatch(%p, %p) → %p', (a, b, expected) => {
    expect(titlesMatch(a, b)).toBe(expected);
  });
});

describe('sweepMissingImages (mocked)', () => {
  // A db stand-in that serves candidates from getAll and records executes.
  function fakeDb(candidates: BackfillCandidate[]) {
    return {
      getAll: jest.fn(async () => candidates),
      execute: jest.fn(async () => ({})),
    } as unknown as AbstractPowerSyncDatabase & {
      getAll: jest.Mock;
      execute: jest.Mock;
    };
  }

  const candidate = (over: Partial<BackfillCandidate>): BackfillCandidate => ({
    id: 'item-1',
    user_id: U1,
    name: 'Abbey Road',
    vertical: 'vinyl',
    pending_image_url: null,
    source: null,
    source_id: null,
    ...over,
  });

  const okStatus = (status: number) =>
    jest.fn(async () => ({ status }) as Response) as unknown as typeof fetch;

  test('(a) pending url succeeds — one attempt, adapter never consulted', async () => {
    const db = fakeDb([candidate({ pending_image_url: 'https://x/a.jpg' })]);
    const saveImage = jest.fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => true);
    const adapterFor = jest.fn();

    await sweepMissingImages({ db, saveImage, adapterFor, clearPending: jest.fn() });

    expect(saveImage).toHaveBeenCalledTimes(1);
    expect(saveImage.mock.calls[0][0]).toMatchObject({
      itemId: 'item-1',
      userId: U1,
      imageUrl: 'https://x/a.jpg',
    });
    expect(adapterFor).not.toHaveBeenCalled();
  });

  test('(a) 404 clears pending; a 500 leaves it for the next sweep', async () => {
    // saveImage exercises the probe fetch, then reports failure — the
    // sweeper's clear decision keys off the observed status.
    const saveImage = jest.fn(async (deps: SaveLookupImageDeps) => {
      await deps.fetchFn!('https://x/a.jpg');
      return false;
    });

    const db404 = fakeDb([candidate({ pending_image_url: 'https://x/a.jpg' })]);
    const clear404 = jest.fn();
    await sweepMissingImages({
      db: db404,
      saveImage,
      adapterFor: jest.fn(),
      fetchFn: okStatus(404),
      clearPending: clear404,
    });
    expect(clear404).toHaveBeenCalledWith(db404, 'item-1');

    const db500 = fakeDb([candidate({ pending_image_url: 'https://x/a.jpg' })]);
    const clear500 = jest.fn();
    await sweepMissingImages({
      db: db500,
      saveImage,
      adapterFor: jest.fn(),
      fetchFn: okStatus(500),
      clearPending: clear500,
    });
    expect(clear500).not.toHaveBeenCalled();
  });

  test('(b) CardSight source link rebuilds the sentinel', async () => {
    const db = fakeDb([
      candidate({ name: '', source: 'CardSight', source_id: 'card-9' }),
    ]);
    const saveImage = jest.fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => true);

    await sweepMissingImages({ db, saveImage, adapterFor: jest.fn(), clearPending: jest.fn() });

    expect(saveImage).toHaveBeenCalledTimes(1);
    expect(saveImage.mock.calls[0][0]).toMatchObject({
      imageUrl: 'cardsight-image:card-9',
    });
  });

  test('(b) only fires for CardSight — other sources fall through to (c)', async () => {
    const db = fakeDb([candidate({ source: 'Discogs', source_id: 'r-1' })]);
    const saveImage = jest.fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => true);
    const adapterFor = jest.fn(() => undefined);

    await sweepMissingImages({ db, saveImage, adapterFor, clearPending: jest.fn() });

    // No sentinel attempt, and (c) bailed on the missing adapter.
    expect(saveImage).not.toHaveBeenCalled();
    expect(adapterFor).toHaveBeenCalledWith('vinyl');
  });

  test('(c) auto-applies only on a confident title match, persisting first', async () => {
    const db = fakeDb([candidate({ name: 'Abbey Road' })]);
    const saveImage = jest.fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => true);
    const adapterFor = jest.fn(() => ({
      templateId: 'vinyl',
      searchByText: jest.fn(async () => [
        { title: 'Abbey Road (Remastered)', imageUrl: 'https://x/found.jpg', fields: {}, source: 'Discogs' },
      ]),
    }));

    await sweepMissingImages({ db, saveImage, adapterFor: adapterFor as never, clearPending: jest.fn() });

    // The found url is persisted as pending BEFORE the fetch attempt.
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('SET pending_image_url'),
      ['https://x/found.jpg', 'item-1']
    );
    expect(saveImage.mock.calls[0][0]).toMatchObject({ imageUrl: 'https://x/found.jpg' });
  });

  test('(c) mismatched or art-less top hits are left alone', async () => {
    const mismatch = fakeDb([candidate({ name: 'Abbey Road' })]);
    const saveImage = jest.fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => true);

    await sweepMissingImages({
      db: mismatch,
      saveImage,
      adapterFor: jest.fn(() => ({
        templateId: 'vinyl',
        searchByText: jest.fn(async () => [
          { title: 'Let It Be', imageUrl: 'https://x/wrong.jpg', fields: {}, source: 'Discogs' },
        ]),
      })) as never,
      clearPending: jest.fn(),
    });
    expect(saveImage).not.toHaveBeenCalled();
    expect(mismatch.execute).not.toHaveBeenCalled();

    const artless = fakeDb([candidate({ name: 'Abbey Road' })]);
    await sweepMissingImages({
      db: artless,
      saveImage,
      adapterFor: jest.fn(() => ({
        templateId: 'vinyl',
        searchByText: jest.fn(async () => [
          { title: 'Abbey Road', fields: {}, source: 'Discogs' },
        ]),
      })) as never,
      clearPending: jest.fn(),
    });
    expect(saveImage).not.toHaveBeenCalled();
  });

  test('attempts run in order (a) → (b) → (c) until one lands', async () => {
    const db = fakeDb([
      candidate({
        name: 'Charizard',
        vertical: 'trading-cards',
        pending_image_url: 'https://x/stale.jpg',
        source: 'CardSight',
        source_id: 'card-1',
      }),
    ]);
    const saveImage = jest.fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => false);
    const searchByText = jest.fn(async () => [
      { title: 'Charizard', imageUrl: 'https://x/fresh.jpg', fields: {}, source: 'CardSight' },
    ]);

    await sweepMissingImages({
      db,
      saveImage,
      adapterFor: jest.fn(() => ({ templateId: 'trading-cards', searchByText })) as never,
      clearPending: jest.fn(),
    });

    const urls = saveImage.mock.calls.map((c) => (c[0] as SaveLookupImageDeps).imageUrl);
    expect(urls).toEqual(['https://x/stale.jpg', 'cardsight-image:card-1', 'https://x/fresh.jpg']);
  });

  test('one bad item never stalls the rest of the queue', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const db = fakeDb([
      candidate({ id: 'item-1', pending_image_url: 'https://x/a.jpg' }),
      candidate({ id: 'item-2', pending_image_url: 'https://x/b.jpg' }),
    ]);
    const saveImage = jest
      .fn<Promise<boolean>, [SaveLookupImageDeps]>(async () => true)
      .mockImplementationOnce(async () => {
        throw new Error('boom');
      });

    await sweepMissingImages({ db, saveImage, adapterFor: jest.fn(), clearPending: jest.fn() });

    expect(saveImage).toHaveBeenCalledTimes(2);
    expect((saveImage.mock.calls[1][0] as SaveLookupImageDeps).itemId).toBe('item-2');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('a custom limit threads through to the candidate query', async () => {
    const db = fakeDb([]);
    await sweepMissingImages({ db, saveImage: jest.fn(), adapterFor: jest.fn(), clearPending: jest.fn(), limit: 3 });
    expect(db.getAll).toHaveBeenCalledWith(expect.any(String), [3]);
  });
});
