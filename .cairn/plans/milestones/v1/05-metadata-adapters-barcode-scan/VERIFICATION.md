# Phase 5: Metadata adapters + barcode scan — Verification

Verified 2026-08-14. Goal-backward against CONTEXT.md + PLAN.md.
Result: **PASS** (one documented deviation).

## What the phase promised vs what exists

| Promise | Evidence |
|---|---|
| One lookup interface, adapter per vertical (REQ-05) | `src/metadata/` — `MetadataAdapter` registry keyed by template id, 8 adapters; 'other' correctly unmapped |
| Keyed sources proxied, secrets server-side (REQ-05) | `metadata` edge function deployed (project bbvuyrcuowcmgjtwyqoz); live-verified per source: Discogs barcode → 12 Kind of Blue pressings, IGDB → Chrono Trigger, OMDb → Jurassic Park, Comic Vine → ASM #300, Rebrickable → 75192-1, CardSight → 1989 Griffey (#11) |
| UPC → title bridge, resolved-once caching | Live: fresh UPCitemdb lookup then `cached:true` on repeat; `upc_cache` RLS on, zero client policies (service-role only) |
| Scan-to-add prefills an item (REQ-06) | **User-verified live on iOS**: Scan to Add → manual barcode entry → lookup → picker → prefilled new-item form |
| Barcode normalization (iOS ean13 quirk) | Unit-tested (`normalizeBarcode`); scanLookup test proves normalized value reaches Discogs |
| Web fallback decision | `canCameraScan` unit-tested (Chromium BarcodeDetector gate, manual entry otherwise); BarcodeDetector gate present in served web bundle |
| No secrets in client bundle | 7 MB web bundle grepped: zero hits for any key value or secret name; `service_role` hits are supabase-js internal role-name constants |
| Test coverage | 86 tests / 7 suites green; tsc clean |
| Dev clients rebuilt with expo-camera | iOS (iPhone 17 Pro sim) Build Succeeded + installed; Android (Pixel 10 Pro emulator) BUILD SUCCESSFUL + installed — ExpoCamera native module present in both |

## Tracker

Issues #5, #6, #11 all closed with evidence + ledger lines. No drift: plan
frontmatter `issues: [5, 6, 11]` matches; open issues #8/#9 belong to
phases 6/7.

## Deviations

- **Physical-device camera scan untested** — no hardware attached; emulators
  cannot scan real barcodes. The camera capture path is expo-camera's own
  machinery behind the tested permission/fallback gates; manual-entry path
  (same downstream pipeline) user-verified. Re-test on first hardware run.
- **TMDB → OMDb swap post-plan** (commercial licensing, ~$150/mo avoided);
  OMDb's own commercial terms flagged in CONTEXT.md, unvetted.
- **Build gotcha recorded to memory**: Android needs brew openjdk@21
  (JBR 25 breaks CMake configure); prebuild --clean eats local.properties.

## Environment notes

Secrets deployed: DISCOGS_KEY/SECRET, TWITCH_CLIENT_ID/SECRET,
OMDB_API_KEY, COMICVINE_API_KEY, REBRICKABLE_API_KEY, CARDSIGHT_API_KEY.
TMDB_ACCESS_TOKEN unset. Test login: test1@thecollector.dev (password reset
2026-08-14).
