# Phase 2 — Verification (2026-08-11)

## Verdict: PASS

Goal-backward check against CONTEXT.md locked decisions and PLAN.md T1–T9.

## What was checked

| Promise (CONTEXT.md) | Evidence |
|---|---|
| Sync Streams (not legacy rules), per-user | `powersync/sync-streams.yaml` (edition 3) deployed; per-user download filtering proven by isolation test |
| supabase-js 2.112 platform-forked client | `src/auth/client.ts`; sessions persist across restarts on all three platforms |
| Email/password, confirmation disabled | signUp returned live sessions for test1/test2 |
| Stack.Protected gating via SessionProvider | signed-out → only auth screens; guard flip navigates automatically (web walk + both sims) |
| Client user_id from session | `src/db/crud.ts` + Postgres rows show correct owner uuid |
| Adopt-on-first-login before connect | Android phase-1 rows ("Android Vinyl") claimed, uploaded — visible in Postgres + on other devices; unit-tested (`adopt.test.ts`) |
| Connector with fatal-code discard | `src/db/connector.ts` — 22xxx/23xxx/42501 discard, others rethrow |
| Sign-out: clear then signOut | web walk: local wiped, guard flipped, re-sign-in re-downloaded |
| RLS + grants on upload path | `supabase/security.sql` applied; uploads succeeded as `authenticated` |
| powersync_role + publication, WAL configs | applied via psql; PowerSync dashboard connection test passed |

## Live verification

- **Web**: sign-up → adopted phase-1 web rows uploaded to Postgres (owner
  verified by SQL); sign-out wiped local; re-sign-in re-downloaded; second
  account (test2) synced and saw NOTHING (isolation).
- **Android** (emulator): signed in as test1 — adopted local rows uploaded,
  web's collection downloaded; both devices converged. Data survives
  force-stop.
- **iOS** (simulator): signed in as test1 — both collections downloaded,
  status synced. (Sign-in typed manually — no tap driver on simctl.)
- **Postgres**: two collections, correct single owner, one item each.

## Gates

- Tests: 28/28 pass (crud, adopt, money). Typecheck clean.
- `plan_drift`: only flags were #2/#3 closed-pre-verification — resolved by
  this file's existence.
- Open issues in phase 2: none.
- TDD frontmatter: none declared.

## Deviations from plan

- **RN transport switched to WebSocket** (`SyncStreamConnectionMethod.WEB_SOCKET`):
  the HTTP streaming path stalled silently on Android (connecting forever,
  no error surfaced). WS connects ~1s on every platform. Worth revisiting
  if HTTP streams matter later (e.g. proxies that block WS).
- Dev-client rebuild required on both native platforms (AsyncStorage is a
  new native module) — expected but easy to forget; documented here for
  future native-dep phases.
- Sync Streams needed `config: edition: 3` (dashboard rejected the bare
  streams file).
- `relativeToDirectory` on auth-screen Links resolved wrong → plain `./`
  hrefs.
- Ops caveats standing: free-tier idle deactivation (Supabase pause +
  PowerSync 1-week); Supabase postgres password used during provisioning
  should be rotated (present in session logs).

Commits: c036598..fd6f316 · #2 and #3 closed with evidence, ~95m logged.
