# Phase 2: Auth + cloud sync — Context

## Locked decisions

- **Sync Streams, not legacy Sync Rules** (streams are GA; rules deprecated).
  Two `auto_subscribe: true` per-user streams over collections + items,
  filtered by `user_id = auth.user_id()`.
- **supabase-js 2.112.x** with the publishable key via
  `EXPO_PUBLIC_SUPABASE_*` env vars. AsyncStorage session storage on native,
  localStorage on web; `react-native-url-polyfill/auto` on native;
  AppState-driven start/stopAutoRefresh.
- **Email/password only this phase; confirmation DISABLED** in the Supabase
  dashboard so signUp returns a live session. Deep-link confirmation +
  OAuth deferred (backlog).
- **Route gating**: `<Stack.Protected>` in root layout driven by a
  SessionProvider (getSession + onAuthStateChange). `(auth)` group holds
  sign-in/sign-up; everything else behind the session guard.
- **Client schema gains `user_id` (text)** on collections + items, set from
  `session.user.id` at insert time. Server columns `default auth.uid()` as
  fallback.
- **Pre-auth rows are ADOPTED, not wiped**: on first sign-in, backfill
  `user_id` on local rows (and rewrite queued ops) BEFORE `db.connect` so
  RLS doesn't 42501-discard the phase-1 leftovers.
- **Connector** per the official demo shape: fetchCredentials returns
  `{endpoint, token: session.access_token}` (JWKS validation, no secret);
  uploadData PUT→upsert / PATCH→update / DELETE→delete with fatal-code
  discard `[/^22...$/, /^23...$/, /^42501$/]` — non-fatal rethrow so the
  SDK retries.
- **Sign-out sequence**: warn if `getUploadQueueStats()` non-empty →
  `db.disconnectAndClear()` → `supabase.auth.signOut()`.
- **Access control split**: Sync Streams filter downloads (replication
  bypasses RLS); RLS + explicit `authenticated` grants gate uploads. Both
  written explicitly (new Data API defaults, enforced Oct 2026).
- **Ops**: dedicated `powersync_role` (replication, bypassrls) + publication
  `powersync`; Direct connection string (not pooler); WAL configs
  `max_wal_size=1GB`, `max_slot_wal_keep_size=1GB` on the Supabase project.
- **Secrets**: URLs/keys in `.env` (`EXPO_PUBLIC_*`), never committed —
  `.env*` already gitignored except `.env.example`.
