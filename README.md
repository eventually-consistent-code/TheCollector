# TheCollector

Mobile/Web App for iOS/Android that allows you to catalog and inventory
anything you collect — trading cards, comics, vinyl, video games, movies,
bourbon, Lego, Funko Pop, and anything else…

Local-first: everything works offline on-device (PowerSync/SQLite), with
cloud sync to Supabase landing in phase 2.

## Stack

- Expo SDK 57 / React Native 0.86 / expo-router — one TypeScript codebase
  for iOS, Android, and web
- PowerSync — SQLite on native, wa-sqlite (worker) on web
- Jest (`jest-expo`) — data-layer tests run against real SQLite via
  `@powersync/node`

## Running it

```bash
npm install
npm run web        # web — works in any browser, no native build needed
npm test           # unit tests
npm run typecheck  # tsc --noEmit
```

iOS/Android need a dev build (PowerSync is a native module — Expo Go won't
work):

```bash
npx expo run:ios       # needs full Xcode
npx expo run:android   # needs Android SDK/emulator
# or build in the cloud:
npx eas build --profile development
```

Note for web: PowerSync's worker assets are committed under
`public/@powersync/`. After upgrading `@powersync/web`, refresh them with
`npx powersync-web copy-assets -o public`.

## Project layout

- `src/app/` — expo-router screens (collections → items)
- `src/db/` — schema, per-platform PowerSync setup, CRUD, hooks
- `src/lib/` — small helpers (money: dollars in, cents stored)
- `.cairn/plans/` — project plan artifacts (roadmap, phases)

## TODO

# - Auth + cloud sync (phase 2)
# - Per-vertical templates with real fields (phase 3)
# - Photos on items (phase 4)
# - Barcode scan + metadata lookup (phase 5)
# - Search/filter/sort (phase 6)
# - Value tracking + stats (phase 7)

More to come...
