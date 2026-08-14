# TheCollector

Mobile/Web App for iOS/Android that allows you to catalog and inventory
anything you collect — trading cards, comics, vinyl, video games, movies,
bourbon, Lego, Funko Pop, and anything else…

Local-first: everything works offline on-device (PowerSync/SQLite), synced
to Supabase behind a required account. Eight collector verticals with
tailored fields, photos on items, and barcode scan-to-add that prefills an
item from the vertical's metadata source.

## Stack

- Expo SDK 57 / React Native 0.86 / expo-router — one TypeScript codebase
  for iOS, Android, and web
- PowerSync — SQLite on native, wa-sqlite (worker) on web; Sync Streams
  against Supabase Postgres (RLS, per-user isolation)
- Supabase — Auth (email/password), Storage (item photos via the
  attachment queue), edge functions (metadata proxy)
- expo-camera — barcode scanning (UPC/EAN/QR); web scans in Chromium via
  BarcodeDetector, manual entry everywhere else
- Metadata sources: Discogs, IGDB, OMDb, Comic Vine, Rebrickable,
  CardSight, Scryfall, Pokémon TCG, Open Food Facts, plus a bundled Funko
  dataset — keyed sources proxied through the `metadata` edge function so
  no secret ships in the client
- Jest (`jest-expo`) — data-layer tests run against real SQLite via
  `@powersync/node`

## Running it

```bash
npm install
cp .env.example .env   # Supabase + PowerSync URLs (EXPO_PUBLIC_*)
npm run web        # web — works in any browser, no native build needed
npm test           # unit tests
npm run typecheck  # tsc --noEmit
```

iOS/Android need a dev build (PowerSync + expo-camera are native modules —
Expo Go won't work):

```bash
npx expo run:ios       # needs full Xcode
npx expo run:android   # needs Android SDK/emulator + a JDK 21
# or build in the cloud:
npx eas build --profile development
```

Note for Android: Gradle wants JDK 21 (`brew install openjdk@21` and point
JAVA_HOME at it) — newer JDKs break the React Native CMake configure step.

Note for web: PowerSync's worker assets are committed under
`public/@powersync/`. After upgrading `@powersync/web`, refresh them with
`npx powersync-web copy-assets -o public`.

## Cloud side

SQL for tables/RLS/replication lives in `supabase/` (apply via the
Dashboard SQL editor); the metadata proxy lives in
`supabase/functions/metadata/`. Its API keys deploy as function secrets:

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill it in
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy metadata
```

## Project layout

- `src/app/` — expo-router screens (collections → items, scan-to-add)
- `src/auth/` — Supabase client + session
- `src/db/` — schema, per-platform PowerSync setup, CRUD, hooks, photos
- `src/templates/` — the eight vertical templates (fields, grading scales)
- `src/metadata/` — lookup adapters, UPC normalization + bridge, registry
- `src/components/` — shared UI (item form, photo grid, template fields)
- `src/lib/` — small helpers (money: dollars in, cents stored)
- `supabase/` — SQL + edge functions
- `.cairn/plans/` — project plan artifacts (roadmap, phases)

## TODO

# - Search/filter/sort (phase 6)
# - Value tracking + stats (phase 7)
# - Camera-scan pass on real hardware (emulators can't scan barcodes)
# - Vet OMDb commercial terms before launch

More to come...
