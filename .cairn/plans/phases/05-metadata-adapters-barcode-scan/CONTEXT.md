# Phase 5: Metadata adapters + barcode scan — Context

## Locked decisions

<!-- decisions made for this phase; on conflict these WIN over tracker issue text -->

- **Scanning API**: expo-camera `CameraView` (`barcodeScannerSettings` +
  `onBarcodeScanned`) — expo-barcode-scanner is removed in SDK 57. Types
  scanned: `upc_a`, `upc_e`, `ean13`, `ean8`, `qr`. Normalize iOS
  ean13-with-leading-zero to UPC-A.
- **Web scanning**: feature-detect `BarcodeDetector` (Chromium only); manual
  barcode entry field is the universal fallback on all platforms. No zxing
  dependency this phase.
- **One lookup interface**: `MetadataAdapter` per vertical —
  `searchByText(query)` always, `lookupByBarcode(upc)` where the source
  supports it, both returning normalized results mapped onto the vertical's
  template fields. Registry keyed by template id (mirrors
  `src/templates/definitions.ts`).
- **Barcode reality** (research): only Discogs does direct barcode lookup.
  All other verticals go UPC → title via bridge (UPCitemdb trial, 100/day)
  → source text search. Every resolved UPC cached in Supabase `upc_cache`
  so a barcode is resolved at most once globally.
- **Edge function**: single `metadata` function with source routing
  (`{source, op, params}`), secrets via `supabase secrets set`, called with
  `supabase.functions.invoke`. Proxied sources: Discogs, IGDB (Twitch OAuth
  token managed server-side), OMDb, Comic Vine, Rebrickable, UPCitemdb
  bridge. Direct-from-client: Scryfall (no key), Pokémon TCG (keyless tier),
  Open Food Facts, Funko static.
- **Funko**: ingest `kennymkchan/funko-pop-data` JSON (MIT, deprecated
  upstream 2026-02-22 but usable) — text search only, no UPC field.
  popiq.dev flagged for later evaluation, not this phase.
- **Bourbon**: TheCocktailDB dropped (recipes, not bottles). Open Food Facts
  by barcode + manual entry fallback.
- **OMDb over TMDB (swapped 2026-08-14, post-deploy)**: TMDB's commercial
  license runs ~$150/mo; the collector is headed commercial. OMDb free tier
  (1,000/day) + patron tiers instead. TMDB adapter/secret removed. NOTE:
  verify OMDb's own commercial/licensing terms before launch — flagged, not
  yet vetted.
- **Sports cards, and any vertical with no barcode hit**: scan falls back to
  template-driven manual entry prefilled with whatever the bridge returned
  (title at minimum).
- **CardSight (added mid-phase, #11)**: cardsight.ai `/v1/catalog/search`
  joins the trading-cards adapter — cross-TCG + sports (12M+ cards), fuzzy
  search, keyed (`X-API-Key`) so it rides the edge-function proxy. Free tier
  750 calls/mo. Text search only this phase; its AI image-identify endpoint
  is a future candidate (pairs naturally with the phase-4 camera work).
