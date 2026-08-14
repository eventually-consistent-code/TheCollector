# Phase 6: Search, filter, sort — Context

## Goal

Find items across all collections by free text, template field values, and
tags; per-collection filters and sortable lists. Runs entirely against the
local PowerSync store — works offline on iOS, Android, and web.

## Locked decisions

<!-- decisions made for this phase; on conflict these WIN over tracker issue text -->

- **Engine reality:** issue #8's "WatermelonDB" wording is stale — the store
  is PowerSync (op-sqlite native / wa-sqlite web). Local-first requirement
  unchanged.
- **Search = LIKE, not FTS5.** `name`/`notes` LIKE + `json_each(custom_fields)`
  value LIKE (matches values, never JSON keys). PowerSync client tables are
  views — FTS5 virtual tables can't live in AppSchema and the trigger recipe
  is standing maintenance; recorded as the escape hatch if search ever
  measures slow, not built now.
- **Filters are template-driven.** Chip groups come from each template's
  select-field options; number fields become ranges; compiled to
  `json_extract` clauses. Zero per-vertical filter UI code.
- **Sort is an enum**, parameterizing `useItems`: name A–Z/Z–A,
  newest/oldest (created_at), value high/low (current_value_cents),
  acquired date. No sort framework.
- **Tags are new**: `items.tags` (JSON array in a text column) added to
  client schema + supabase/schema.sql + replication publication + crud
  insert/update lists in ONE change; filtered via `json_each`. Tag input
  is a simple chip editor on the item form.
- **UI slots:** global search = new Stack route `search.tsx` with a header
  entry point on the collections screen; filter/sort UI = collection
  screen's existing ListHeaderComponent pattern. Estate & Ember styling per
  the Vault mocks (brass-outline chips, hunter-green active states).
