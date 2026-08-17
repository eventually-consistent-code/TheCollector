# Phase 5: Metadata adapters + barcode scan — Research

Researched 2026-08-13. Sources cited inline; flagged items are unverified.

## Barcode scanning (Expo SDK 57)

- `expo-barcode-scanner` is gone (404 on the v57 docs). Scanning lives in
  **expo-camera**: `<CameraView barcodeScannerSettings={{ barcodeTypes }}
  onBarcodeScanned={fn} />`.
  - `barcodeTypes` literals include `upc_a`, `upc_e`, `ean13`, `ean8`, `qr`.
  - `onBarcodeScanned: (result: BarcodeScanningResult) => void` — fields
    `type`, `data`, `bounds`, `cornerPoints`.
  - Android = MLKit, iOS = AVFoundation/VisionKit.
  - iOS quirk (flagged, from experience not docs): UPC-A often reported as
    `ean13` with leading `0` — normalize defensively.
  - Source: https://docs.expo.dev/versions/v57.0.0/sdk/camera/
- **Web**: expo-camera web scanning rides the browser `BarcodeDetector` API —
  **Chromium only** (no Safari/Firefox as of Aug 2026). Feature-detect
  `'BarcodeDetector' in window`; universal fallback = manual barcode entry
  field. `@zxing/library` exists if Safari camera scanning ever matters —
  skipped for now.

## Metadata sources — the punchline

**Only Discogs supports direct barcode lookup.** Everything else needs
UPC → product title (bridge API), then text search against the vertical's
source. Summary:

| Source | Barcode? | Auth | Limit | Proxy? |
|---|---|---|---|---|
| Discogs | ✅ `/database/search?barcode=` | key+secret (search requires auth), unique User-Agent | 60/min | yes |
| IGDB | ❌ (external_games has no UPC category) | Twitch client-credentials OAuth, token ~60d (flagged) | 4 req/s | yes |
| TMDB | ❌ text search only | Bearer read token | ~50/s (flagged) | yes |
| Comic Vine | ❌ text search only (`/search/?resources=issue,volume`, ≤10/page) | api_key in query | ~200/resource/hr informal (flagged) | yes |
| Scryfall | ❌ n/a (no barcodes on cards) | none; accurate User-Agent required | 2/s hard on search, 429 ⇒ 30 s lockout | no |
| Pokémon TCG | ❌ | optional free `X-Api-Key` | 20k/day keyed, 1k/day + 30/min keyless | no |
| Rebrickable | ❌ — set lookup by set number `/api/v3/lego/sets/{set_num}/` | `Authorization: key` | ~1/s community (flagged) | yes |
| Funko | ❌ | static dataset | n/a | no |
| Bourbon | Open Food Facts `/api/v2/product/{barcode}` — spotty liquor coverage (flagged) | none | 15/min/IP | no |

- **Funko**: `kennymkchan/funko-pop-data` marked **deprecated 2026-02-22**
  (points to popiq.dev, unvetted). MIT, 23,940 entries, 7.4 MB JSON —
  `{handle, title, imageName, series[]}`, no UPC field. Still fine to ingest
  for text search; popiq.dev flagged for later evaluation.
- **TheCocktailDB dropped**: cocktail recipes, no bottle catalog, no barcode,
  paid production key — weak fit for bourbon. Open Food Facts + manual entry
  instead.
- Comic UPCs: Metron (metron.cloud) has a UPC field on issues — flagged,
  unverified; not in this phase.

## UPC → title bridge

- **UPCitemdb trial**: `https://api.upcitemdb.com/prod/trial/lookup?upc=` —
  no key, **100 req/day, burst 6/min**. Paid DEV tier 20k/day if needed.
- Open Food Facts as secondary (free, food/liquor-leaning).
- Mitigation for the 100/day cap: cache every resolved UPC in a Supabase
  table (`upc_cache`) so each barcode is resolved at most once globally.

## Edge functions (supabase-js v2, current Aug 2026)

`supabase.functions.invoke('name', { body })`; errors discriminate via
`FunctionsHttpError` (`await error.context.json()`) / `FunctionsRelayError` /
`FunctionsFetchError`. Secrets: `supabase secrets set NAME=value` (live
immediately, no redeploy), read with `Deno.env.get('NAME')`; local dev
auto-loads `supabase/functions/.env`.

Citations: discogs.com/developers · api-docs.igdb.com ·
developer.themoviedb.org · comicvine.gamespot.com/api/documentation ·
scryfall.com/docs/api · docs.pokemontcg.io · rebrickable.com/api/v3/docs ·
github.com/kennymkchan/funko-pop-data · upcitemdb.com/wp/docs ·
openfoodfacts.github.io · supabase.com/docs/guides/functions/secrets ·
caniuse.com/mdn-api_barcodedetector
