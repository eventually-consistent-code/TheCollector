/**
 * Purpose: PowerSync backend connector — Supabase JWT in, CRUD queue out.
 * Fatal Postgres errors are discarded (else one bad row blocks the queue
 * forever); everything else rethrows so the SDK retries.
 * Author(s): John Reed
 */

import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
} from '@powersync/common';

import { supabase } from '@/auth/client';

// Constants

const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL;

// Data exceptions, integrity violations, insufficient privilege (RLS) —
// retrying these can never succeed, so drop the op and move on.
const FATAL_RESPONSE_CODES = [/^22...$/, /^23...$/, /^42501$/];

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    if (!POWERSYNC_URL) {
      throw new Error('Missing EXPO_PUBLIC_POWERSYNC_URL — see .env.example');
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }
    return {
      endpoint: POWERSYNC_URL,
      token: session.access_token,
    };
  }

  async uploadData(db: AbstractPowerSyncDatabase) {
    const tx = await db.getNextCrudTransaction();
    if (!tx) {
      return;
    }

    let lastOp = null;
    try {
      for (const op of tx.crud) {
        lastOp = op;
        const table = supabase.from(op.table);
        let result;
        switch (op.op) {
          case UpdateType.PUT:
            result = await table.upsert({ ...op.opData, id: op.id });
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData ?? {}).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }
        if (result?.error) {
          throw result.error;
        }
      }
      await tx.complete();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code && FATAL_RESPONSE_CODES.some((re) => re.test(code))) {
        console.error('discarding unrecoverable op', lastOp?.table, lastOp?.id, code);
        await tx.complete();
        return;
      }
      // Recoverable (network, auth, transient) — SDK retries.
      throw err;
    }
  }
}
