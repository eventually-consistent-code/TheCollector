# TheCollector

## Vision

Mobile/web app (iOS, Android, web) to catalog and inventory anything you
collect. One typed engine, eight collector verticals at launch: trading cards,
comics, vinyl, video games, movies/discs, bourbon/liquor, Lego, Funko Pop.
Local-first — the app works fully offline on-device — with required-account
cloud sync so a collection follows the collector across devices and the web.

**Stack (locked at interview; local engine revised 2026-08-09 after phase-1
research):** Expo / React Native + web, one TypeScript codebase. PowerSync as
the local engine (SQLite on iOS/Android via `@powersync/react-native`,
wa-sqlite/OPFS on web via `@powersync/web`) with PowerSync's productized
Supabase sync. Supabase as the cloud half: Postgres + RLS, Auth (account
required at launch), Storage for item photos, edge functions for metadata-API
proxying. WatermelonDB was the interview pick but is dormant (no commits since
Aug 2025, beta-only Expo plugin, DIY sync) — see phase 1 RESEARCH.md.

**Metadata sources per vertical:** Discogs (vinyl), IGDB (video games),
TMDB + disc DB (movies), Comic Vine (comics), Scryfall / Pokémon TCG API
(trading cards — sports cards manual), Rebrickable (Lego),
kennymkchan/funko-pop-data (Funko — static dataset, seeded not live),
TheCocktailDB + WhiskeyProject/whiskey-api (bourbon/liquor). Verticals without
a usable barcode source fall back to template-driven manual entry.

## Requirements

REQ-01: Collection/item CRUD on a local-first PowerSync data layer that runs on iOS, Android, and web from one codebase
REQ-02: Required Supabase account — sign-up/sign-in gate on all three platforms
REQ-03: Cloud sync — PowerSync against Supabase Postgres with RLS, per-user isolation
REQ-04: Eight vertical templates with tailored fields (trading cards, comics, vinyl, video games, movies/discs, bourbon/liquor, Lego, Funko Pop)
REQ-05: Metadata adapters per vertical behind one lookup interface, proxied through edge functions where keys are required
REQ-06: Barcode/QR scan-to-add that prefills an item via the vertical's metadata adapter
REQ-07: Photos on items — camera + gallery capture, multiple images, thumbnails, synced via Supabase Storage
REQ-08: Search, filter, and sort across collections by text, field, and tag
REQ-09: Value tracking — purchase price, current value, collection totals, simple stats
