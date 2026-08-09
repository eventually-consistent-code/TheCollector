# Phase 1: Foundation — app scaffold + local data layer — Context

## Locked decisions

- **Local engine: PowerSync, not WatermelonDB** (2026-08-09, user-confirmed;
  reverses the interview pick — see RESEARCH.md). `@powersync/react-native`
  on iOS/Android (real SQLite), `@powersync/web` (wa-sqlite/OPFS) on web.
  Sync stays UNCONFIGURED this phase — local-only usage; the Supabase
  connector lands in phase 2.
- **Expo SDK 57** (`expo@57.x`, RN 0.86, expo-router SDK-versioned), one
  TypeScript codebase, single-app repo (no monorepo — no second consumer).
- **Dev builds, not Expo Go** — PowerSync is a native module; `expo-dev-client`
  from day one.
- **TypeScript ~6.0.3** (template default). Do not jump to TS 7 yet.
- **Schema**: `collections` (name, vertical) + `items` (collection_id, name,
  notes, acquired_at, purchase_price_cents, current_value_cents,
  custom_fields JSON, timestamps). **Money in integer cents.**
- **Per-vertical custom fields = JSON column on items, not EAV** — one-column
  sync payload, in-memory filtering fine at personal-collection scale,
  Postgres `jsonb` GIN later, promote hot fields to real columns via
  migration if needed.
- **Layout**: `app/` routes only; data layer in `src/db/` (schema, per-platform
  database setup via Metro platform extensions, hooks/queries).
- **Testing**: `jest-expo` preset; data-layer unit tests against PowerSync's
  in-memory/Node path.
