# Phase 4: Photos — Context

## Locked decisions

- **New attachments system from @powersync/common 2.x** (`AttachmentTable`
  + `AttachmentQueue`, no subclass) — NOT the deprecated standalone
  `@powersync/attachments` package. Alpha API: pin exact versions, isolate
  all queue wiring in `src/db/photos.ts` so churn stays contained.
- **Local storage adapters**: platform-split —
  `ExpoFileSystemStorageAdapter` (`@powersync/attachments-storage-react-native`)
  on native, `IndexDBFileSystemStorageAdapter` (@powersync/web) on web.
  One shared queue; web is first-class (no fallback path).
- **Domain schema**: synced `photos` table (id, item_id, user_id,
  media_type, created_at) + local-only AttachmentTable. Storage object
  name = `{photo.id}.jpg` — derived, never stored. Display joins photos ⟕
  attachments, renders local_uri when state = SYNCED.
- **Capture**: expo-image-picker only (camera + multi-select library);
  no custom camera screen. Action-sheet style on native, single picker
  entry on web (camera launch must stay inside the user gesture).
  Config plugin with `microphonePermission: false`.
- **Resize at capture, no thumbnail pipeline**: max dimension 2048px,
  JPEG q0.8 via expo-image-manipulator's OO API. Grids render from local
  files with expo-image (`recyclingKey`, `contentFit="cover"`).
- **Supabase Storage**: private `photos` bucket, OWNER-BASED RLS on
  storage.objects (uploads are flat `{id}.jpg`; path-prefix policies
  would 403 the demo-shaped adapter). SQL committed in `supabase/`.
- **errorHandler from day one**: download 'Object not found' → no retry.
- **Sign-out**: photos ride the existing `disconnectAndClear` wipe; local
  attachment files cleared via queue on user switch (verify at T7).
- **Dev-client rebuild required** (image-picker native module) — both
  platforms, budgeted as part of the capture task.
