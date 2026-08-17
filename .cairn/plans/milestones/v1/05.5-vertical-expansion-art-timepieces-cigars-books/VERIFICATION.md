# Phase 5.5 Verification — Vertical Expansion (Art, Timepieces, Cigars, Books)

Date: 2026-08-14
Verdict: **PASS**

## Goal-backward check

Phase promise: four new verticals live end-to-end — models/templates,
metadata adapters with permanent lookup caching, Estate & Ember mocks for
the two unmocked verticals. Checked against the codebase and the deployed
cloud function, not just closed issues.

| Promise | Evidence |
|---|---|
| 4 new templates registered w/ field renderers | TEMPLATES = 13 (was 9); cigars vitola/wrapper selects, books collector-asserted edition field, timepieces box/papers booleans, art provenance/exhibition + insured-value money field |
| Adapters behind the one lookup interface | ADAPTERS registry carries art/books/timepieces/cigars; ProxySource union extended; only 'other' remains manual-only |
| Permanent lookup caching | lookup_cache table live in cloud (RLS verified, service-role-only, mirrors upc_cache); art/books/timepieces ride cachedSource/cachedSearch; cigars UPC path rides upc_cache |
| ISBN scan routing | Bookland 978/979 EAN-13s route to the books adapter (src/metadata/adapters/books.ts) |
| Live lookups on deployed fn | Books: ISBN 9780743273565 → The Great Gatsby + cover. Art: "water lilies monet" → work-level AIC match w/ medium/dimensions/IIIF image. Timepieces: "Rolex 126234" → Datejust 36 full record. Cigars: UPC 843182122555 → Hemingway Short Story, confidence 1.0 |
| Cache-hit proof | Identical timepieces query: 1.34s → 0.54s, zero upstream quota spent; books repeat served from cache |
| Graceful degradation | Timepieces key-unset → in-band unavailable payload; quota 402/429 → friendly limit message; free-tier too_many_results → in-band "add the reference number" refine message (fix 5d7b23d, live-tested); books Google fallback skips cleanly when key unset |
| Mocks (Timepieces + Cigars vault/detail) | The Winder (e28663a3, regenerated to fix header/tab drift), Watch Detail (24494414), The Humidor (7febb1a0), Cigar Detail (7c8ed1ac) — all screenshot-verified against the shell and collector patterns; no marketplace CTAs |
| Secrets | THEWATCHAPI_KEY + GOOGLE_BOOKS_KEY set in edge fn env; fn deployed |

## Test suite

15 suites / 180 tests passing (86 at phase start); `tsc --noEmit` clean.

## Tracker

All 7 phase issues (#12–#18) closed with evidence + time actuals; zero open
issues on the phase; no TDD-flagged tasks in PLAN.md.

## Deviations (accepted)

- Architecture: no per-vertical tables exist — templates ARE the models
  (verticals ride the items table's custom_fields JSON). Zero SQL for #12;
  round-trip test proves persistence.
- thewatchapi: model-search endpoint used instead of reference-search (docs
  reality: reference-search returns bare pairs); free tier requires
  reference-scoped queries — broad text degrades to a refine message.
- Cigars adapter caches via upc_cache directly rather than the new
  cachedSource wrapper (worktree predated #13's merge) — identical
  one-lookup-ever effect; folding onto cachedSource is optional cleanup.
- Winder mock: piece-count/value stat absent from the top bar — cosmetic;
  superseded first-attempt Winder screen still on the Stitch canvas,
  deletable.

## Follow-ups (backlog candidates, not blockers)

- Email Elite Cigar Library re: licensing their 56k-cigar dataset.
- Optional RapidAPI Cigars API autocomplete behind a feature flag.
- Fold cigars UPC path onto cachedSource.
- Delete superseded Winder screen from the Stitch canvas.
