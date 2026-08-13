/**
 * Purpose: Sync lifecycle — adopt ownerless rows then connect when a session
 * appears; tear down + clear local data on sign-out.
 * Author(s): John Reed
 */

import { SyncStreamConnectionMethod, type AbstractPowerSyncDatabase } from '@powersync/common';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { supabase } from '@/auth/client';
import { adoptLocalData } from './adopt';
import { SupabaseConnector } from './connector';
import { startPhotoSync, stopPhotoSync } from './photos';

// Connects sync whenever a session is present. Adoption runs BEFORE the
// first connect so pre-auth rows upload under the new owner.
export function useSyncLifecycle(
  db: AbstractPowerSyncDatabase,
  session: Session | null
) {
  const connectedFor = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id ?? null;
    if (!userId) {
      // Signed out — allow a future re-connect (even for the same user).
      connectedFor.current = null;
      return;
    }
    if (connectedFor.current === userId) {
      return;
    }
    connectedFor.current = userId;

    (async () => {
      const adopted = await adoptLocalData(db, userId);
      if (adopted.collections || adopted.items) {
        console.log(
          `adopted local data: ${adopted.collections} collections, ${adopted.items} items...`
        );
      }
      // WebSocket transport — RN's HTTP stream stalls (observed on Android
      // emulator: connecting=true forever, no error). WS connects in ~1s.
      await db.connect(new SupabaseConnector(), {
        connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
      });
      await startPhotoSync(db);
    })().catch((err) => {
      connectedFor.current = null;
      console.error('sync connect failed', err);
    });
  }, [db, session?.user.id]);
}

// Sign-out sequence: disconnect + wipe local data (next user must not see
// this user's rows), then end the Supabase session (flips the route guard).
export async function signOutAndClear(db: AbstractPowerSyncDatabase) {
  await stopPhotoSync();
  await db.disconnectAndClear();
  await supabase.auth.signOut();
}
