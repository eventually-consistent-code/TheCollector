# Phase 5.5: vertical expansion art timepieces cigars books — Ledger

<!-- append-only; one line per verified task; server appends, never rewrites -->

- [x] 12 — Four new vertical templates (art/timepieces/cigars/books) with field renderers + tests; no schema changes needed — verticals ride the opaque custom_fields path — commits a74e886..542f921 — 12 closed 2026-08-14
- [x] 13 — lookup_cache table + shared write-through cache helper in metadata edge fn; cloud-applied, RLS verified, fn redeployed — commits a74e886..6341d4f — 13 closed 2026-08-14
- [x] 18 — Timepieces + Cigars vault/detail mocks live in Stitch (Winder/Watch Detail/Humidor/Cigar Detail), verified; Winder header+tab nit noted for canvas edit — commits 6db608d..6db608d — 18 closed 2026-08-14
- [x] 14 — Books adapter live: Open Library + Google Books fallback, ISBN scan routing, cached; Gatsby verified on deployed fn — commits e47a316..d679708 — 14 closed 2026-08-14
- [x] 15 — Art adapter live: AIC + Met (capped fan-out) + Wikidata artist tier w/ match flag; Monet verified on deployed fn — commits e47a316..bb60d22 — 15 closed 2026-08-14
- [x] 16 — Timepieces adapter live: thewatchapi reference-scoped search (free-tier too_many_results fix 5d7b23d) + UPC bridge + cache; Rolex 126234 verified w/ cache hit — commits e47a316..5d7b23d — 16 closed 2026-08-14
- [x] 17 — Cigars vertical live: 213-row/52-brand seed dataset + fuzzy matcher + UPC path; Fuente box UPC verified at confidence 1.0 — commits e47a316..b6a80d9 — 17 closed 2026-08-14
