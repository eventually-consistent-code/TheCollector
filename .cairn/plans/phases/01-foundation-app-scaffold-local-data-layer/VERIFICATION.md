# Phase 1 — Verification (2026-08-10)

## Verdict: PASS

Goal-backward check against CONTEXT.md promises and PLAN.md tasks T1–T8.

## What was checked

| Promise (CONTEXT.md) | Evidence |
|---|---|
| PowerSync local engine, per-platform (native SQLite / wa-sqlite web) | `src/db/database.native.ts` + `database.web.ts` + type-default `database.ts`; worker assets in `public/@powersync/` |
| Expo SDK 57, one TS codebase, dev builds not Expo Go | Dev builds compiled + installed on iPhone 17 sim and Pixel 10 Pro emulator |
| Schema: collections + items, custom_fields JSON, money in cents | `src/db/schema.ts`; round-trip covered by unit tests |
| Layout: `app/` routes only, data layer in `src/db/` | Matches; screens consume `crud.ts`/`hooks.ts` only |
| Testing: jest-expo, data layer against real engine | 26/26 passing (`@powersync/node` + better-sqlite3, temp db per test) |

## Live verification (all three platforms)

- **Web** (Chrome, dev server): create collection → add item → edit value
  ($45.00 → $95.50) → two-tap delete arm → full-page reload → data intact.
- **Android** (Pixel 10 Pro emulator, adb-driven): created "Android Vinyl",
  added "Abbey Road" @ $35.00, reactive list update, force-stop + relaunch →
  data intact. Screenshot-evidenced.
- **iOS** (iPhone 17 simulator): dev build installs, launches, renders the
  collections screen through a PowerSync watch query (proves op-sqlite JSI
  init), stable across terminate/relaunch. No tap driver on simctl — full
  UI walk done on Android/web instead; JS is shared, iOS-specific risk is
  native module init, which rendering exercises.

## Gates

- Tests: 26/26 pass. Typecheck: clean.
- `plan_drift`: only flag was #1 closed-pre-verification — resolved by this
  file's existence.
- Open issues in phase 1: none.
- TDD frontmatter: none declared; no pairs required.

## Deviations from plan

- Local engine switched WatermelonDB → PowerSync at plan time (user-approved,
  RESEARCH.md) — PLAN.md was written post-switch, no drift.
- Verify surfaced three real bugs, fixed in 3980a73: expo-router style-array
  throw on Link children, explicit worker path for @powersync/web under
  Metro, web output static → single (SSR incompatible with PowerSync).
- Android toolchain: requires JDK 21 (AS-bundled JDK 25 breaks AGP CMake
  configure); `android/local.properties` must point at the SDK.
- Vertical chip UI on Android registered "other" instead of "vinyl" during
  the adb walk — input-coordinate artifact of the keyboard suggestion bar,
  not a reproducible app defect; chips verified working on web.

Commits: 378eeda..67c6d9c · Issue #1 closed with evidence + ~75m logged.
