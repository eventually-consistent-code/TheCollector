---
issues: [2, 3]
depth: standard
---
# Phase 2: Auth + cloud sync — Plan

## Tasks

Advances #2 (REQ-02, auth) and #3 (REQ-03, sync). Provisioning first —
tasks T3+ are blocked until the cloud side exists. T1/T2 need the user in
the loop (dashboard access, credentials).

- [x] T1 (#3) — Supabase project provisioning: schema DDL (uuid ids,
      `user_id default auth.uid()`), RLS policies + explicit
      `authenticated` grants, `powersync_role` + publication `powersync`,
      WAL configs, email confirmation OFF. Output: `supabase/` SQL files
      in-repo + applied to the project.
- [x] T2 (#3) — PowerSync Cloud provisioning: instance, Direct-connection
      credentials, "Use Supabase Auth" (JWKS), deploy per-user Sync
      Streams. Output: stream definitions committed in-repo.
- [x] T3 (#2) — Client auth plumbing: supabase-js + AsyncStorage +
      url-polyfill, platform-forked `src/auth/client.ts`, `.env` +
      `.env.example`.
- [x] T4 (#2) — SessionProvider + `<Stack.Protected>` gating in root
      layout; `(auth)` group with sign-in/sign-up screens (shared form
      components); session survives restart on all three platforms.
- [x] T5 (#3) — Schema v2: add `user_id` to collections + items (client),
      set from session on insert; bump schema version.
- [x] T6 (#3) — Adopt-on-first-login: backfill `user_id` on pre-auth local
      rows before first connect; unit-tested.
- [x] T7 (#3) — SupabaseConnector (fetchCredentials + uploadData with
      fatal-code discard); `db.connect(connector)` when session ready;
      sign-out sequence (queue check → disconnectAndClear → signOut).
- [x] T8 (#2,#3) — Sync status UI: `useStatus()` indicator (connected /
      syncing / error) visible on the collections screen.
- [x] T9 (#3) — End-to-end verify: offline write → reconnect → row in
      Postgres; second account isolation; user switch on one device;
      queued phase-1 rows adopted + uploaded. All three platforms.
