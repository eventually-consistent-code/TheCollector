/**
 * Purpose: Adopt-on-first-login — phase-1 rows were written before accounts
 * existed and have no user_id; RLS would discard them on upload. Backfill
 * BEFORE the first connect so the queued ops sync under the new owner.
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';

// Claims ownerless local rows for the signed-in user. Returns counts.
export async function adoptLocalData(
  db: AbstractPowerSyncDatabase,
  userId: string
): Promise<{ collections: number; items: number }> {
  let collections = 0;
  let items = 0;
  await db.writeTransaction(async (tx) => {
    // Count first — rowsAffected isn't populated on every driver.
    const c = await tx.get<{ n: number }>(
      `SELECT count(*) AS n FROM collections WHERE user_id IS NULL OR user_id = ''`
    );
    const i = await tx.get<{ n: number }>(
      `SELECT count(*) AS n FROM items WHERE user_id IS NULL OR user_id = ''`
    );
    collections = c.n;
    items = i.n;
    if (collections > 0) {
      await tx.execute(
        `UPDATE collections SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
        [userId]
      );
    }
    if (items > 0) {
      await tx.execute(
        `UPDATE items SET user_id = ? WHERE user_id IS NULL OR user_id = ''`,
        [userId]
      );
    }
  });
  return { collections, items };
}
