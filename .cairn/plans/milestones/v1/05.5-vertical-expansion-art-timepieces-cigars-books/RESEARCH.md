# Phase 5.5 — Metadata source research (2026-08-14)

Deep dive on free/open databases and APIs for the four new verticals. All
endpoints below were live-verified on 2026-08-14 by parallel research agents
unless noted. Full evaluation including rejected sources; the winners are
locked in CONTEXT.md.

## Books

**Primary: Open Library** (Internet Archive) — no auth, free, open data.
- Barcode: `GET https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`
  — title, authors, publisher, publish_date, identifiers, subjects in one call.
- Text: `GET https://openlibrary.org/search.json?q=…&fields=title,author_name,first_publish_year,edition_count,publisher&limit=5`
- Covers: `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg` (S/M/L;
  `?default=false` for 404 instead of blank; 100 req/IP per 5 min limit on
  ISBN-keyed covers — cache the CoverID after first hit, CoverID lookups are
  unlimited).
- Editions per work (edition-picker UI): `GET https://openlibrary.org/works/{workId}/editions.json`
- Soft limit ~1 req/s; send a User-Agent with contact info.
- Gap: `edition_name` populated on ~1 of 200 sampled Gatsby editions; no API
  anywhere encodes first-printing points (number lines, issue points).

**Fallback: Google Books** — free API key, 1,000 req/day/project (raisable).
- `GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}&key=…` with
  `&fields=` partial responses. Keyless calls get pooled-IP 429s — key required.
- Best text-search relevance (`intitle:`, `inauthor:`). Weak edition data.

**Paid upgrade if needed: ISBNdb** — ~$15/mo, explicit `edition`/`binding`
fields, 33M ISBNs, strong post-1970. No permanent free tier.

**Pricing signal:** no free official source. AbeBooks' undocumented
`POST https://www.abebooks.com/servlet/DWRestService/pricingservice`
(`action=getPricingDataByISBN&isbn=…`) live-verified returning best new/used
prices — feature-flag only, zero ToS blessing. viaLibri Search Link API =
outbound deep link. eBay Browse API (free key, 5k calls/day) is the only
ToS-clean programmatic option.

**Rejected:** WorldCat/OCLC (institutional subscription only; xISBN and
Classify retired), LibraryThing (license prohibits server-side fetching;
Cloudflare-blocked), Internet Archive advancedsearch (scans, not an edition
catalog — supplemental link at best).

## Art

**Primary: Art Institute of Chicago** — no auth, CC0, actively maintained.
- `GET https://api.artic.edu/api/v1/artworks/search?q={query}&fields=id,title,artist_display,date_display,medium_display,dimensions,image_id&limit=10`
  — real Elasticsearch, full hydrated records in one call, accepts ES DSL.
- Images: IIIF — `https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg`
- ~60 req/min anonymous. Stick to `/artworks` + `/agents` (CC0); some other
  endpoints are noncommercial.

**Fallback: The Met** — no auth, 492k CC0 records, richest structured fields
(`measurements` array, `artistULAN_URL`, `artistWikidata_URL`).
- `GET https://collectionapi.metmuseum.org/public/collection/v1/search?artistOrCulture=true&hasImages=true&q=…`
  returns objectIDs only → `GET /objects/{id}` per result (cap fan-out ~10).
- 80 req/s guideline.

**Third leg: Cleveland Museum of Art** — no auth, CC0, daily refresh,
dedicated `artists=`/`title=` params, provenance + exhibition history
in-payload: `GET https://openaccess-api.clevelandart.org/api/artworks/?artists=…&title=…&has_image=1`

**Artist authority: Wikidata** — `action=wbsearchentities` for autocomplete;
SPARQL for dates/nationality/movement/aliases. Carry Getty ULAN ids (Met/AIC
emit them) as canonical cross-ref; Getty AAT for medium normalization
(ODC-By, attribution required).

**Situational:** MoMA CSV (GitHub, ~160k works, updated 2026-06) and National
Gallery of Art CSVs (daily) — ingest into Supabase if modern/American depth
needed. Smithsonian (5M CC0 records, worst-in-class nested EDAN shape,
1k req/hr). Europeana (50M records, uneven quality; personal-key rate limits
shrinking through Apr 2026 — Project key required for production).

**Key UX finding:** museum APIs only match works those museums hold. Private
collectors' pieces match at artist level far more often than work level —
adapter must prefill artist metadata when the title search misses.

**Valuation: none free, none legal.** artprice/artnet/askART paid, no free
API; auction houses prohibit scraping; Artsy public API officially being
retired ("may be taken down at any time"). User-entered value only.

**Rejected:** WikiArt (perpetual beta, murky licensing, copyrighted images),
Artsy (dying), Harvard (2,500/day + commercial use requires permission),
legacy Rijksmuseum API (shut down late 2025 — new data.rijksmuseum.nl is
Linked-Art/JSON-LD, multi-hop, Dutch-masters only; skip for now).

## Timepieces

**Primary: thewatchapi.com** — the one genuine free structured watch API.
- Free tier: 25 req/day, 3 results/request; Basic $19/mo (500/day) if it
  pinches. API token auth (`THEWATCHAPI_KEY`).
- `GET /v1/reference/search` — brand, reference_number, model, movement,
  year_of_production range, case_material, case_diameter. Near-exact schema
  match. Historical asking prices (beta) at brand/model/reference level.
- 200+ brands claimed; small independent operator, no SLA — permanent
  Supabase caching mandatory (each watch looked up once, ever).

**Barcode bridge:** existing UPCitemdb adapter — modern mainstream boxed
watches (Seiko/Citizen/Casio/Timex/Orient/Bulova) resolve to a title string →
feed into thewatchapi search. Luxury Swiss boxes mostly don't barcode
usefully; vintage/pocket watches have no UPC.

**Manual fallback:** free-form entry with brand names normalized from a
one-time Wikidata brand pull (brand entities solid; model coverage in
Wikidata is ~zero — 256 items total).

**Paid upgrade path:** WatchCharts API (~$800/yr + credits) — best-in-class
market valuations, the only serious option if real pricing becomes a feature.

**Rejected:** Chrono24 (no official API, ToS prohibits scraping, heavy bot
detection), WatchBase ($0.30/entry DataFeed ≈ $12.5k full DB; stale since
~2020; no images), EveryWatch (B2B sales-call only), WatchSignals (dead
since ~2021), GitHub datasets (static scrapes, provenance issues), Grail
Watch Reference (great caliber encyclopedia, no API).

## Cigars

**No clean free API exists.** Bourbon playbook applies.

**Primary stack:**
1. UPCitemdb (existing key, existing upc_cache) — box UPCs. Live-verified:
   `843182122555` → "Arturo Fuente Hemingway Short Story" w/ brand. Expect
   modest hit rate on boxes, near-zero on singles; title-parse to extract
   line/vitola.
2. Curated seed dataset shipped with the app: ~top 50 brands × lines ×
   standard vitolas — wrapper/binder/filler, ring gauge, length, country,
   release year. Hand-built from Halfwheel/manufacturer facts (facts aren't
   copyrightable); est. a few days of curation. Fuzzy-match UPC titles
   against it.
3. Manual-entry template with vitola + wrapper pickers — the reliable path;
   cigar collectors are used to it.

**Optional:** RapidAPI "Cigars API" (DaThresh, 2022) — freemium
brand/line/wrapper/strength search, no UPC, hobby project; feature-flag for
autocomplete, assume it can vanish. Email Elite Cigar Library
(elitecigarlibrary.com, 56k cigars, API "under consideration for a fee")
about licensing — cheapest path to real depth.

**Rejected:** CigarDB (dead, DNS gone), Cigar Scanner/Neptune (closed retail
catalog, ToS), Cigar Aficionado (23k ratings, locked, no API), Halfwheel
(editorial, no API — manual seed reference only), Open Products Facts
(3 cigar records), TTB (aggregate tax stats only), Wikidata (brand level
only, inconsistently typed), GitHub (bioinformatics CIGAR-string noise).

## Cross-cutting

- **Caching:** extend the upc_cache pattern to text-query lookups for all
  four adapters — write-through cache in Supabase, permanent. Makes the
  25/day watch tier and 100/day UPCitemdb tier non-issues.
- **New env keys:** `THEWATCHAPI_KEY` (required), `GOOGLE_BOOKS_KEY`
  (optional). Everything else keyless.
- **Attribution:** Getty vocabularies ODC-By (attribution required);
  Google Books expects "powered by Google" where content displays;
  Open Library requests courtesy backlink.
