# Phase 1 — Research brief (2026-08-09)

Standard-depth research pass on the local-first stack. Full findings below;
headline: the interview-locked WatermelonDB choice did not survive contact
with 2026 — switched to PowerSync (user-confirmed 2026-08-09).

## Stack versions (verified 2026-08-09)

- **Expo SDK 57** (`expo@57.0.11`, 2026-08-06) — React Native 0.86.2,
  React 19.2.3, react-native-web ~0.21, `expo-router@57.0.11`
  (SDK-versioned now). Template ships TypeScript ~6.0.3 — stay there;
  TS 7.0.2 (native-port compiler) decorator/compat story unverified.
- **PowerSync**: `@powersync/react-native@2.0.2` + `@powersync/web@2.1.1`
  (both released 2026-08-05 — actively maintained). Optional
  `@powersync/drizzle-driver@0.8.0`. Official Supabase integration guide:
  https://docs.powersync.com/integration-guides/supabase-+-powersync
- Native modules ⇒ **dev builds (`expo-dev-client`), not Expo Go**.

## Why not WatermelonDB (interview pick, reversed)

- Repo dormant — last commit 2025-08-11, last stable 0.28.0 (2025-04-07),
  301 open issues.
- New Architecture support never landed officially (issue #1769 open);
  community workarounds verified only to SDK 54 / RN 0.83.
- Expo config plugin (`@morrowdigital/watermelondb-expo-plugin`) current-SDK
  support is beta-only (2.4.0-beta.0).
- Web adapter = LokiJS, whole DB in memory, overwrite-based multi-tab; no
  SQLite-on-web roadmap.
- Phase-2 Supabase sync would be fully DIY pull/push endpoints against its
  protocol.

PowerSync counter: real SQLite on native, wa-sqlite/OPFS on web, active
releases, productized Supabase sync (phase 2 shrinks to configuration +
sync rules). Trade-off accepted: PowerSync Service dependency between
Postgres and clients (cloud free tier or self-hosted).

Rejected alternates: RxDB (active, Supabase replication plugin, but partly
paid/premium); Legend-State (v3 stuck in beta, latest stable Aug 2024 —
avoid); raw expo-sqlite + Drizzle (no sync story without PowerSync anyway).

## Schema modeling decision

- Core tables: `collections` (name, vertical), `items` (collection_id,
  name, notes, acquired_at, purchase/current price **in cents**,
  created/updated timestamps).
- **Per-vertical custom fields = JSON column (`custom_fields`) on items,
  not EAV.** Reasons: sync payload stays one column per item; per-item
  conflict resolution trivial; personal-collection scale (<~10k items)
  filters fine in memory after indexed collection fetch; Postgres side gets
  a `jsonb` GIN index later; any query-hot field can be promoted to a real
  column by migration. Keep name/notes as real columns for LIKE search.

## Testing

- `jest-expo@57.0.3` preset. PowerSync unit tests: in-memory/web adapter in
  Node; add PowerSync packages to `transformIgnorePatterns`.

## Risks

1. PowerSync Service becomes a runtime dependency in phase 2 (cloud or
   self-hosted) — acceptable, but it's a third moving part.
2. First dev-client build (EAS or local prebuild) is new project plumbing —
   budget for it in phase 1, not phase 2.
3. wa-sqlite/OPFS on web needs COOP/COEP headers in some configs — verify
   during web scaffold.
4. TS 7 migration deferred; revisit when Expo template moves.
