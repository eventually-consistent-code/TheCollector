# Phase 5.5: Vertical Expansion — Art, Timepieces, Cigars, Books — Context

## Goal

Four new collection verticals (art, timepieces, cigars, books) live end-to-end:
data models, template registry entries, metadata adapters with permanent lookup
caching, and Estate & Ember vault/detail mockups for the two verticals not yet
mocked (timepieces, cigars). Brings the app from 8 to 12 verticals.

## Locked decisions

<!-- decisions made for this phase; on conflict these WIN over tracker issue text -->

- **Books adapter:** Open Library primary (keyless; `api/books?bibkeys=ISBN:…&jscmd=data`
  for barcode, `search.json` for text, covers via `covers.openlibrary.org`),
  Google Books fallback (free key, 1,000 req/day, `GOOGLE_BOOKS_KEY` optional).
  First-edition identification is manual — no API encodes printing points; the
  template carries an edition/printing field the collector asserts.
- **Art adapter:** Art Institute of Chicago primary (keyless, CC0, single-call
  hydrated search `api.artic.edu/api/v1/artworks/search?q=…&fields=…`), Met
  Museum fallback (keyless, ID-then-fetch fan-out), Wikidata `wbsearchentities`
  for artist autocomplete/authority. Text-search-only lookup path — no barcode.
  UX rule: works usually miss, artists usually hit → prefill artist metadata
  even when title search misses. Valuation = user-entered purchase/insured
  price; no free legal market source exists (explicit non-goal).
- **Timepieces adapter:** thewatchapi.com reference search primary
  (`THEWATCHAPI_KEY`, free tier 25 req/day → permanent Supabase caching
  mandatory, upgrade to $19/mo Basic only if throttled). Modern boxed watches:
  existing UPCitemdb bridge resolves UPC → title → feed into reference search.
  Vintage/luxury: manual entry with Wikidata brand normalization.
- **Cigars adapter:** bourbon playbook — UPCitemdb box-UPC lookup (existing
  key + upc_cache), fuzzy match against a curated seed dataset shipped with
  the app (~top 50 brands × lines × vitolas: wrapper/binder/filler, ring
  gauge, length, country, release year), manual-entry template with vitola +
  wrapper pickers as the reliable path. Optional: RapidAPI "Cigars API"
  (DaThresh) behind a feature flag for autocomplete; email Elite Cigar
  Library (56k rows) re: data licensing.
- **Caching:** every successful adapter lookup persists (extend the
  upc_cache pattern to text-query lookups) — each item looked up once, ever.
- **Rejected sources (do not revisit without new evidence):** WorldCat/OCLC
  (institutional-only), LibraryThing (server-side fetch prohibited), Artsy API
  (being retired), WikiArt (licensing murk), Chrono24 (no API, scraping = ToS
  trap), WatchBase ($0.30/record), EveryWatch (B2B only), WatchSignals (dead),
  CigarDB (dead), Cigar Scanner/Neptune (closed retail data), Cigar Aficionado
  (locked), Open Products Facts cigars (3 records), TTB (aggregates only).
- **Mockups:** Stitch project "The Collector Unified Platform"
  (10619147081399329079), Estate & Ember design system
  (assets/4f9c99fcb6fc42cbae8779c9ec90c552). Art + Books vault/detail mocks
  exist; this phase adds Timepieces + Cigars vault/detail. Marketplace-style
  CTAs (Place Bid, Speak to a Specialist) from the Art mock are style
  reference only — app is personal inventory, no bidding flows.
