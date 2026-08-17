# Phase 2 — Research brief (2026-08-10)

Standard-depth pass on Supabase auth + PowerSync cloud sync. Full sources at
bottom; the decisions this locks are in CONTEXT.md.

## Headline changes vs. training-era knowledge

- **Sync Streams replaced Sync Rules** (GA since ~mid-2026; sync-rules YAML is
  officially "Legacy"). Greenfield projects use streams with
  `auto_subscribe: true` per-user queries. Do NOT copy old bucket-YAML
  tutorials.
- Supabase quickstarts now use **publishable keys** (`sb_publishable_...`)
  instead of the legacy anon JWT key.
- PowerSync validates Supabase JWTs via **JWKS auto-detection** — no shared
  secret, no token-exchange endpoint.

## Versions (verified on npm 2026-08-10)

- `@supabase/supabase-js` 2.112.2 (still v2 API). Needs
  `react-native-url-polyfill/auto` on native (Hermes URL incomplete) and
  `@react-native-async-storage/async-storage` for session storage.
- Local stack already current: @powersync/react-native 2.0.2, /web 2.1.1,
  /react 2.0.0, op-sqlite 17.1.5.

## Auth (client)

- One `createClient`, platform-forked: AsyncStorage on native, localStorage
  default on web; `autoRefreshToken`, `persistSession`, `processLock`, and an
  AppState listener toggling `startAutoRefresh/stopAutoRefresh` on native.
- Plain email/password needs NO extra packages (auth-helpers is SSR-era;
  expo-auth-session only for OAuth/magic-link deep links).
- Email confirmation: redirect-based → deep-link plumbing on native. For this
  phase: **disable confirmation** (Dashboard → Auth → Email → Confirm email
  off) so `signUp()` returns a live session; deep-link handling deferred.
- Route gating: expo-router SDK 57 `<Stack.Protected guard={...}>` in root
  layout, driven by a SessionProvider (initial `getSession()` +
  `onAuthStateChange`). Redirect + history purge automatic.

## PowerSync Cloud

- Free tier: 2 GB synced/mo, 500 MB hosted, 50 concurrent, 2 instances;
  **instances deactivate after 1 week idle** (dev annoyance; so does Supabase
  free-tier pause).
- Connect with Supabase **Direct connection** string (not the pooler —
  logical replication), swapped to a dedicated `powersync_role`
  (replication + bypassrls + login). Publication named `powersync` over
  collections + items.
- Enable "Use Supabase Auth" → JWKS URI auto-detected.
- Streams (per-user):
  ```yaml
  streams:
    user_collections:
      auto_subscribe: true
      query: SELECT * FROM collections WHERE user_id = auth.user_id()
    user_items:
      auto_subscribe: true
      query: SELECT * FROM items WHERE user_id = auth.user_id()
  ```

## Access-control split (important)

- **Download path**: logical replication as `powersync_role` (bypassrls) —
  RLS never gates downloads; **Sync Streams ARE the read-side filter**.
- **Upload path**: `uploadData` writes via supabase-js as `authenticated` —
  RLS + table grants both apply (missing grant = 42501 before RLS runs).
  New Data API defaults (enforced Oct 2026) require explicit
  `grant select, insert, update, delete ... to authenticated`.

## Connector (@powersync 2.x, unchanged interface)

- `fetchCredentials`: `{ endpoint: POWERSYNC_URL, token: session.access_token }`
  from `supabase.auth.getSession()`. SDK re-calls near expiry (~1 h TTL).
- `uploadData`: `getNextCrudTransaction()` loop — PUT→upsert, PATCH→update,
  DELETE→delete; `tx.complete()` after. **Fatal codes discard, others
  rethrow**: `[/^22...$/, /^23...$/, /^42501$/]`. A throwing uploadData
  blocks the entire queue (5 s retry forever) — discard logic is day-one.
- **Pre-connect queue confirmed**: synced-table writes land in `ps_crud`
  with no connector; first `db.connect(connector)` flushes them.

## Schema implications

- Client schema **gains `user_id` (text)** on both tables — streams route by
  querying it, and rows sync back including it. Set from `session.user.id`
  on insert; server column `default auth.uid()` as fallback.
- **Phase-1 leftover rows have no user_id** → RLS `with check` would 42501
  them on first upload. Backfill user_id locally at first sign-in BEFORE
  connect (adopt-on-first-login), or wipe. Decision: adopt (CONTEXT.md).
- Server DDL: uuid ids (PowerSync requires text/uuid, no serial), RLS
  `for all to authenticated using/with check (auth.uid() = user_id)`.

## Ops gotchas

- Supabase idle WAL bloat: set `max_wal_size=1GB` and
  `max_slot_wal_keep_size=1GB` (`supabase --experimental postgres-config`).
- Sign-out: check `getUploadQueueStats()` → `db.disconnectAndClear()` →
  `supabase.auth.signOut()`. Without clear, next user sees prior user's rows.
- Hermes `structuredClone` may be missing (supabase-js #1504) — polyfill if
  hit. UNVERIFIED whether RN 0.86 ships it.
- Web: existing worker setup suffices; `useStatus()` from @powersync/react
  for connected/hasSynced/errors.

## Risks

1. Pre-auth local rows without user_id silently discarded by RLS unless
   backfilled before first connect.
2. Sync Streams newly GA — mixed-era docs; legacy YAML examples mislead.
3. Free-tier idle deactivation (Supabase pause + PowerSync 1-week) breaks
   sync confusingly mid-dev.
4. WAL bloat on idle Supabase can eat free-tier disk without the two configs.
5. Throwing uploadData blocks the queue forever — fatal-code discard from
   day one.

Sources: PowerSync+Supabase integration guide, Sync Streams overview/GA
announcement, RLS-and-sync-streams doc, SupabaseConnector demo
(react-supabase-todolist), Supabase RN auth quickstart, Expo protected
routes, powersync.com/pricing, supabase-js npm/#1504.
