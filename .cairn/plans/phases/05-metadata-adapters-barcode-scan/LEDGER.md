# Phase 5: Metadata adapters + barcode scan — Ledger

<!-- append-only; one line per verified task; server appends, never rewrites -->

- [x] 11 — CardSight wired into trading-cards adapter and live — cardsight source in metadata edge function (X-API-Key server-side), card-type results mapped (set/parallel/numberedTo→variant), deployed + secret set, live-verified: "1989 ken griffey jr upper deck" returns the rookie — commits f976aab..f976aab — 11 closed 2026-08-14
- [x] 5 — Metadata adapters live behind one lookup interface — 8 vertical adapters (registry keyed by template id), metadata edge function proxying 6 keyed sources + UPC bridge with global upc_cache, all sources live-verified post-deploy; keyless direct adapters under jest — commits f388390..bbbd838 — 5 closed 2026-08-14
- [x] 6 — Scan-to-add live: manual barcode entry → lookup → picker → prefilled item, user-verified on iOS; both dev clients rebuilt with expo-camera; bundle secret-audit clean; hardware camera scan deferred (no device) — commits f388390..296e821 — 6 closed 2026-08-14