# Phase 4 — Research brief (2026-08-13)

Offline-first photo sync stack. Headlines first, details after.

## Headlines

1. **Attachments API moved**: the standalone `@powersync/attachments`
   package (3.0.0) is the LEGACY line — docs deprecate it. The new system
   lives in `@powersync/common` 2.x: `AttachmentTable` + `AttachmentQueue`
   (no subclassing), imported from the platform SDK. Marked
   @alpha/@experimental — pin exact versions.
2. **Web fully supported**: `IndexDBFileSystemStorageAdapter` from
   @powersync/web (IndexedDB, `indexeddb://` URIs). Official demo
   `react-native-web-supabase-todolist` is literally our stack —
   platform-split local adapter, one shared queue.
3. **No thumbnail pipeline**: one resize at capture (~2048px JPEG q0.8,
   ~300-600KB) + expo-image grid rendering handles <100 photos/user.
   Also bakes EXIF orientation, converts HEIC, strips GPS metadata,
   ~10x storage/egress savings.

## New attachments API (verified from source)

- Schema: `attachments: new AttachmentTable()` — hard-coded
  `localOnly: true`; never syncs, never hits uploadData. Only the domain
  `photos` table syncs. States: QUEUED_UPLOAD/QUEUED_DOWNLOAD/
  QUEUED_DELETE/SYNCED(3)/ARCHIVED.
- Queue: `new AttachmentQueue({ db, localStorage, remoteStorage,
  watchAttachments, errorHandler, syncIntervalMs=30s })` →
  `queue.startSync()` after connect.
- watchAttachments: for-await over `db.watch('SELECT id FROM photos')` →
  `onUpdate([{id, fileExtension: 'jpg'}])`.
- Write: `queue.saveFile({ data: ArrayBuffer, fileExtension, mediaType,
  updateHook })` — updateHook inserts the photos row in the SAME
  transaction. Delete: `queue.deleteFile({id, updateHook})`.
- RemoteStorageAdapter: uploadFile/downloadFile/deleteFile over
  ArrayBuffers — the queue reads local files itself.
- Local adapters: native `ExpoFileSystemStorageAdapter` (or RN-fs variant)
  from `@powersync/attachments-storage-react-native` 0.0.3 (peers
  expo-file-system ≥19 — uses the NEW SDK 54+ File/Directory API);
  web `IndexDBFileSystemStorageAdapter` from @powersync/web.
- Display: native `file://` URI direct; web `readFile` → Blob →
  `URL.createObjectURL` (+ revoke on unmount).

## Capture

- expo-image-picker 57.0.9 sufficient — no custom camera screen.
  `launchImageLibraryAsync({ mediaTypes: ['images'],
  allowsMultipleSelection: true, quality: 0.8 })` + `launchCameraAsync`.
- Library pick needs NO permission (system picker); camera needs
  `requestCameraPermissionsAsync` (no-op web).
- Web: library = file input (works); camera must be called inside a user
  gesture, desktop degrades to file picker — design "Add photo" as action
  sheet on native / single picker on web.
- Config plugin: `["expo-image-picker", { photosPermission, cameraPermission,
  microphonePermission: false }]` — the false kills the default
  RECORD_AUDIO Android permission. DEV-CLIENT REBUILD REQUIRED.

## Processing

- expo-image-manipulator 57: `manipulateAsync` deprecated → OO API:
  `ImageManipulator.manipulate(uri)` → `.resize({width: 2048})` →
  `renderAsync()` → `saveAsync({format: JPEG, compress: 0.8})`.

## Supabase Storage

- Private bucket `photos`. **Owner-based RLS** (not path-prefix): insert
  to authenticated with check bucket_id='photos'; select/delete using
  owner_id = auth.uid()::text. (Demo uploads flat `{id}.jpg` at bucket
  root — path-prefix policies would 403 it and the queue retries forever.)
- Adapter is verbatim demo: `.upload(name, arrayBuffer, {contentType})` /
  `.download()` → ArrayBuffer / `.remove([name])`.
- errorHandler: onDownloadError 'Object not found' → return false (no
  retry) — else deleted photos hammer storage every 30s.
- Free tier: 1 GB storage (~2000 photos at 500KB), 50 MB max file,
  5 GB egress. Signed URLs not needed (display always from local file).

## Schema

- Postgres: `photos(id uuid pk, item_id, user_id, media_type, created_at)`
  + RLS + grants + add to publication + new Sync Stream. Object name =
  `{photo.id}.jpg`, derived never stored.
- Client: `photos` synced Table + `AttachmentTable`. Display join:
  `photos LEFT JOIN attachments a ON a.id = photos.id`, show when
  a.state = 3 via a.local_uri.

## Risks

1. Alpha API churn (common 2.x attachments + storage pkg 0.0.3) — pin
   exact versions, isolate queue setup in one module.
2. RLS/path mismatch → 403 + infinite retry. Owner-based policies chosen;
   test upload/download on two accounts.
3. Web heap pressure (ArrayBuffer round-trips) — capture-time resize
   mitigates; revoke blob URLs.
4. Missing-object retry loops — errorHandler from day one.
5. Free-tier ceilings + device re-install re-downloads eat egress.

UNVERIFIED: owner_id stamping via JS-client uploads under RLS (standard
but test before trusting policies); desktop-web launchCameraAsync nuance.
