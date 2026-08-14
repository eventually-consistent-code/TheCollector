# Phase 5 — cloud deploy checklist (blocked on credentials)

Code is committed and tested; these steps need John's hands (interactive
login + API accounts). Once done, T7 e2e verify can run.

## 1. Supabase CLI login

```bash
npx supabase login          # interactive — or export SUPABASE_ACCESS_TOKEN
```

## 2. Apply SQL (upc_cache)

Same route as photos.sql: paste `supabase/metadata.sql` into the Dashboard
SQL editor (project bbvuyrcuowcmgjtwyqoz), or `psql "$DB_URL" -f supabase/metadata.sql`.

## 3. Create API credentials (one per keyed source)

| Secret | Where |
|---|---|
| `DISCOGS_KEY` / `DISCOGS_SECRET` | discogs.com/settings/developers — create app |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | dev.twitch.tv/console — register app (IGDB) |
| `TMDB_ACCESS_TOKEN` | themoviedb.org/settings/api — API Read Access Token |
| `COMICVINE_API_KEY` | comicvine.gamespot.com/api — free key |
| `REBRICKABLE_API_KEY` | rebrickable.com/api — free key |
| `CARDSIGHT_API_KEY` | cardsight.ai — free tier 750 calls/mo |

UPCitemdb trial tier needs no key (100 lookups/day, cached in upc_cache).

## 4. Set secrets + deploy

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill it in
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy metadata
```

## 5. Native rebuilds

expo-camera config plugin added → dev clients need a rebuild on both
platforms before T7:

```bash
npx expo run:ios
npx expo run:android
```
