# Phase 4 — Verification (2026-08-13)

## Verdict: PASS

Goal-backward check against CONTEXT.md locked decisions and PLAN.md T1–T7.

## What was checked

| Promise (CONTEXT.md) | Evidence |
|---|---|
| New attachments system (common 2.x), wiring isolated | `src/db/photos.ts` holds ALL queue wiring; AttachmentTable local-only in schema; versions pinned (storage pkg 0.0.3 exact) |
| Platform-split local adapters, web first-class | photos-local.native/.web; web downloads + renders from IndexedDB (verified live) |
| photos table synced, object name derived | Postgres rows + `{id}.jpg` objects match 1:1; `photoObjectName` unit-tested |
| Capture via image-picker only, resize at capture | 49KB objects from multi-hundred-KB sources; picker works on web (file input) and Android (system picker) |
| Owner-based storage RLS | `supabase/photos.sql`; owner_id stamped on upload (SQL-verified — the flagged UNVERIFIED risk) |
| No-retry on missing objects | errorHandler + `shouldRetryDownload` unit tests |
| Sign-out hygiene | user switch test1→test2 on Android left no foreign photos |
| Dev-client rebuilds | both platforms rebuilt; picker module verified live on Android |

## Live verification

- **Web**: capture → upload (Postgres row + Storage object, owner
  stamped) → tile renders; cold-load renders both tiles; two-tap delete
  removed row + remote object.
- **Android**: cross-device download of the web photo, rendered in the
  grid (49,836 bytes byte-exact on device); **offline capture**
  (airplane mode) saved locally, uploaded on reconnect (~25s);
  native system picker verified.
- **iOS**: shared JS; boot/render verified in phase flow. Deep iOS photo
  walk not tap-driveable (simctl limitation, standing note since phase 1).

## Gates

- Tests: 61/61. Typecheck clean.
- `plan_drift`: only #7 closed-pre-verification — resolved by this file.
- Open issues in phase 4: none.
- TDD frontmatter: none declared.

## Deviations / discoveries (both fixed in eb4310d)

- **Hermes Blobs lack `arrayBuffer()`** — downloads failed silently in an
  infinite 30s retry loop on Android. FileReader fallback + warn-level
  error logging in the handler (silent retry loops can't hide now).
- **Web tile read raced queue init** — single attempt + swallow left
  placeholders forever. Bounded retry with backoff.
- Legacy note: `@powersync/attachments` npm package deliberately NOT used
  (deprecated line); anyone touching this area should read phase 4
  RESEARCH.md first.

Commits: c806345..6e02b0d · #7 closed with evidence, ~60m logged.
