---
issues: [1]
depth: standard
---
# Phase 1: Foundation — app scaffold + local data layer — Plan

## Tasks

Advances #1 (REQ-01). Walking-skeleton order — each task leaves the app
runnable on all three targets.

- [x] T1 — Scaffold Expo SDK 57 app: TypeScript template, expo-router,
      `expo-dev-client`, web enabled; boots on iOS sim, Android emulator,
      and web (blank shell is fine).
- [x] T2 — Add PowerSync: `@powersync/react-native` + `@powersync/web`,
      per-platform database setup (`src/db/database.native.ts` /
      `src/db/database.web.ts`, shared export), local-only (no connector).
      Verify COOP/COEP header needs on web dev server.
- [x] T3 — Define schema in `src/db/schema.ts`: `collections` +
      `items` per CONTEXT.md (custom_fields JSON, money in cents).
- [x] T4 — Data-access layer: typed CRUD + reactive watch queries
      (`src/db/hooks.ts`) for collections and items; no UI knowledge.
- [x] T5 — Collections UI: list / create / rename / delete, vertical picked
      at create from a placeholder list (real templates are phase 3).
- [x] T6 — Items UI: item list within a collection, add/edit/delete with
      common fields (name, notes, acquired date, prices); lists update
      reactively from watch queries.
- [x] T7 — Test rig: `jest-expo` preset, transformIgnorePatterns for
      PowerSync, unit tests covering schema + CRUD in the data layer.
- [x] T8 — Cross-platform verify: CRUD flows exercised on iOS, Android,
      web; data survives app restart (persistence check); README run
      instructions.
