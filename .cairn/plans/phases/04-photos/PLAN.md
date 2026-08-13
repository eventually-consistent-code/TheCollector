---
issues: [7]
depth: standard
---
# Phase 4: Photos — Plan

## Tasks

Advances #7 (REQ-07). Cloud side first, then queue, then capture/UI.

- [x] T1 — Supabase: private `photos` bucket + owner-based RLS on
      storage.objects; `photos` table (DDL + RLS + grants), add to
      `powersync` publication + new per-user Sync Stream (edition 3).
      SQL committed in `supabase/`, streams in `powersync/`.
- [x] T2 — Client wiring: add `photos` Table + `AttachmentTable` to
      schema; `src/db/photos.ts` — platform-split local adapter,
      SupabaseRemoteStorageAdapter, watchAttachments over photos,
      errorHandler (no-retry on missing object); `startSync()` after
      connect; pinned package versions.
- [x] T3 — Capture + process: expo-image-picker (camera + multi-select
      library) with config plugin (`microphonePermission: false`),
      resize-to-2048 JPEG pipeline → `queue.saveFile` with updateHook
      inserting the photos row. Dev-client rebuilds both platforms.
- [x] T4 — Display: `<ItemPhoto>` component (expo-image; file:// native,
      IndexedDB→blob URL web with revoke-on-unmount; pending placeholder
      until SYNCED), photo grid on the item screen, count badge on rows.
- [x] T5 — Delete: long-press/tap-to-delete with two-tap confirm →
      `queue.deleteFile` + photos row removal; verify remote object gone.
- [x] T6 — Tests: photos crud round-trip, watchAttachments query shape,
      object-name derivation, errorHandler no-retry decision.
- [x] T7 — Verify: web capture→upload→Postgres+Storage; second device
      downloads; offline capture on Android → reconnect → appears on
      web; sign-out/switch-user leaves no foreign photos; missing-object
      delete behavior.
