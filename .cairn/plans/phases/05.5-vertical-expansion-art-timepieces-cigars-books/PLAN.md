---
issues: [12, 13, 14, 15, 16, 17, 18]
wave_1: [12, 13, 18]
wave_2: [14, 15, 16, 17]
---
# Phase 5.5: Vertical Expansion — Art, Timepieces, Cigars, Books — Plan

## Tasks

<!-- tasks; frontmatter 'issues' lists the tracker ids this plan advances -->

Adapter picks, caching rule, env keys, and rejected sources are locked in
CONTEXT.md; source evaluation with verified endpoints in RESEARCH.md.

### Wave 1 — foundations (independent)

- **#12 — Models + templates** (5 pts / ~120m): four vertical models on the
  existing 8-model pattern + template registry entries with field renderers
  (vitola/wrapper pickers, edition/printing field, artist block, box/papers
  flags). Migration applied cloud-side; per-model tests.
- **#13 — Lookup cache** (3 pts / ~60m): extend upc_cache to text-query
  lookups (source + normalized query → payload), write-through, permanent.
  Shared edge-fn helper. Prerequisite for all four adapters.
- **#18 — Stitch mocks** (2 pts / ~45m): Timepieces + Cigars vault/detail in
  Estate & Ember; personal-inventory CTAs only.

### Wave 2 — adapters (need #12 + #13)

- **#14 — Books** (3 pts / ~90m): Open Library primary (ISBN + text + covers),
  Google Books fallback (optional key), scan routes EAN-13 978/979 here.
- **#15 — Art** (5 pts / ~120m): AIC primary, Met fallback (capped fan-out),
  Wikidata artist autocomplete; artist-level prefill when work search misses.
- **#16 — Timepieces** (3 pts / ~90m): thewatchapi reference search
  (THEWATCHAPI_KEY, 25/day → cache mandatory), UPCitemdb bridge for modern
  boxed watches, Wikidata brand seed for manual path.
- **#17 — Cigars** (5 pts / ~150m): curated seed dataset (~top 50 brands ×
  lines × vitolas), UPC title-parse + fuzzy match, manual template as the
  reliable path. Seed curation is the long pole — start it first in the wave.

### Verification shape

Each adapter: live lookup demo (one real item per vertical), cache-hit on
second lookup, graceful degradation with key unset/quota hit. Models: CRUD +
sync round-trip. Total estimate: 26 pts / ~11.5h.
