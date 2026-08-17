# Phase 6 — Search/filter/sort research (2026-08-14)

Codebase-mapping research; citations verified read-only.

## Stack facts

- Client DB: PowerSync — op-sqlite native (`src/db/database.native.ts`),
  wa-sqlite worker on web (`src/db/database.web.ts`); same AppSchema + SQL
  surface both platforms. Reads via `useQuery` watch queries in
  `src/db/hooks.ts`; writes in `src/db/crud.ts`.
- Items schema (`src/db/schema.ts:30-44`): user_id, collection_id, name,
  notes, acquired_at, purchase_price_cents, current_value_cents,
  custom_fields (JSON text), created_at, updated_at. One index
  (collection_id). Server mirror `supabase/schema.sql:17-27`.
- FTS5 exists in both drivers BUT PowerSync client tables are views over
  `ps_data__*` — FTS virtual tables can't be declared in AppSchema; the
  official recipe needs hand-made tables + triggers re-run after every
  db.init(). Not worth it at single-collector scale.
- JSON1 fully available (PowerSync's own view layer is built on it) —
  `json_extract` / `json_each` on custom_fields work in watch queries.
- No search/filter/sort code exists (`useItems` hard-codes
  `ORDER BY created_at DESC`, hooks.ts:31). No search box in the UI.
- Navigation is a plain Stack (no tabs): index → collection/[id] →
  item/[id]. Collection screen already uses ListHeaderComponent — natural
  slot for filter/sort UI. Global search fits as a new Stack route.
- **No tags anywhere** — REQ-08 mentions tag search, so phase 6 must add
  the column (items.tags JSON array text; additive columns are sync-safe,
  but src/db/schema.ts + supabase/schema.sql + replication publication +
  crud.ts insert/update lists must change together).
- Sort-candidate real columns: name, created_at, updated_at, acquired_at,
  purchase_price_cents, current_value_cents. Everything else lives in
  custom_fields → `json_extract` per template.

## Recommended architecture (adopted into CONTEXT.md)

- Search: LIKE over name/notes + `json_each(custom_fields)` values (not raw
  LIKE on the JSON blob — avoids matching keys). Instant at collector
  scale; zero schema surgery; FTS5 recorded as the future escape hatch.
- Filters: template-registry-driven — `templateFor(vertical).fields` select
  fields become chip groups from their options; number fields become
  ranges; compiled to `json_extract(custom_fields, '$.key') = ?` clauses.
  No per-vertical UI code — the payoff of the template architecture.
- Sort: small enum (name A–Z, newest/oldest, value high/low, acquired),
  parameterizing useItems instead of the hard-coded ORDER BY.
- Tags: `EXISTS (SELECT 1 FROM json_each(items.tags) WHERE value = ?)`.
