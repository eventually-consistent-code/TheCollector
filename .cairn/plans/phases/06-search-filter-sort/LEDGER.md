# Phase 6: search filter sort — Ledger

<!-- append-only; one line per verified task; server appends, never rewrites -->

- [x] 19 — items.tags column end-to-end (schema/crud/cloud-applied) + tag chip editor; legacy rows tolerate absent tags — commits 0b733e0..397687c — 19 closed 2026-08-14
- [x] 20 — Query layer: search hook + template-driven filter compiler + sort enum; json_valid guard bug caught by db-backed tests — commits 0b733e0..f1f6ec8 — 20 closed 2026-08-14
- [x] 21 — Global search screen: debounced cross-collection search route + header entry, labeled results, empty states — commits bb52e4e..30157e0 — 21 closed 2026-08-14
- [x] 22 — Collection filter+sort UI: template-driven chips, value ranges, tag facets, sort pills; json_valid tag-guard fix to wave-1 clause — commits bb52e4e..38b9a5d — 22 closed 2026-08-14
- [x] 8 — REQ-08 umbrella verified: offline search/filter/sort + tags on device; tag-search gap traced (#23) and fixed bcfdd50 — commits 0b733e0..f12e537 — 8 closed 2026-08-14
