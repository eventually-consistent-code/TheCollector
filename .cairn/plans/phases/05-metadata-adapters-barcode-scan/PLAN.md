---
issues: [5, 6, 11]
depth: standard
---
# Phase 5: Metadata adapters + barcode scan — Plan

## Tasks

Advances #5 (REQ-05) and #6 (REQ-06). Interface first, then cloud proxy,
then adapters, then scan UI on top.

- [x] T1 — Adapter interface + registry: `src/metadata/types.ts`
      (`MetadataAdapter`, `MetadataResult`, normalized field mapping onto
      template fields), `src/metadata/index.ts` registry keyed by template
      id. UPC normalization helper (ean13-leading-zero → upc_a). (#5)
- [x] T2 — Supabase: `metadata` edge function (code committed; deploy
      blocked — see DEPLOY.md) with source routing
      (`{source, op, params}`) proxying Discogs, IGDB (server-side Twitch
      token cache), TMDB, Comic Vine, Rebrickable, UPCitemdb bridge;
      `upc_cache` table (DDL + RLS) checked before any bridge call; secrets
      via `supabase secrets set`. SQL + function committed in `supabase/`. (#5)
- [x] T3 — Direct adapters: Scryfall (2/s throttle, User-Agent), Pokémon
      TCG (keyless), Open Food Facts (bourbon), Funko static dataset
      (ingest JSON, bundle or seed table + text search). (#5)
- [x] T4 — Proxied adapters: vinyl/Discogs (true barcode lookup), video
      games/IGDB, movies/TMDB, comics/Comic Vine, Lego/Rebrickable (set
      number entry + UPC bridge) — all through `functions.invoke('metadata')`
      with typed error handling. (#5)
- [x] T5 — Scan-to-add UI: scan screen with `CameraView`
      (`barcodeScannerSettings` upc_a/upc_e/ean13/ean8/qr), web
      `BarcodeDetector` feature-detect, manual entry fallback everywhere;
      scan → adapter lookup → prefilled add-item form for the collection's
      vertical; no-hit path falls back to manual entry with bridge title
      prefilled. Dev-client rebuilds if config changes. (#6)
- [x] T6 — Tests: registry resolution per template, UPC normalization,
      result→field mapping per adapter, upc_cache hit short-circuit,
      edge-function routing (request shaping), scan fallback decision
      (BarcodeDetector present/absent). (#5, #6)
- [x] T8 — CardSight (adopted #11): `cardsight` source in the metadata edge
      function (`/v1/catalog/search`, X-API-Key server-side), merged into the
      trading-cards adapter ahead of Pokémon/Scryfall — covers the
      sports-card gap. `CARDSIGHT_API_KEY` added to secrets checklist. (#11)
- [ ] T7 — Verify: scan a real UPC on Android + iOS dev client → prefilled
      item; web Chromium scan + web Safari manual-entry fallback; Discogs
      barcode path end-to-end; keyed sources return data through the proxy
      with no secret in client bundle; UPC cache row written once. (#5, #6)
