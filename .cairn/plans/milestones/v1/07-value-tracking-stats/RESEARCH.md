# Phase 7 — Value tracking research (2026-08-17)

Codebase-mapping research, citations verified read-only.

## Exists already
- items.purchase_price_cents / current_value_cents / acquired_at
  (schema.ts:36-38; supabase/schema.sql:24-26) written by crud.
- Dashboard: DASHBOARD_TOTALS_SQL / VERTICAL_BREAKDOWN_SQL /
  RECENT_ITEMS_SQL (query.ts:288-306, hooks.ts:115-127).
- stats.ts TOTALS_SQL (counts only) feeds Insights placeholder + Profile.
- #41 delivered TCGPriceLookup valueCents on card picks.

## Confirmed missing
- Zero time-series anywhere (schema = collections/items/photos/attachments).
- Collection screen shows item count, never a value SUM.
- sourceId is NOT persisted on items — a pick's source link dies at save
  (item-form save() + crud column lists carry no source fields), so
  re-pricing later has nothing to key on.

## Synced-table checklist (photos precedent; lookup_cache is server-only)
schema.ts Table + AppSchema · supabase DDL + RLS ("own photos" pattern:
user_id = auth.uid()) · powersync/sync-streams.yaml new stream
(auto_subscribe, SELECT * WHERE user_id = auth.user_id(); dashboard
deploy). New COLUMNS need no stream change (schema.sql:41-44 documents).

## Charts
No chart/svg dep installed; Expo 57 does not bundle react-native-svg
(expo install away, no config plugin). victory-native-xl needs skia —
heavy native dep + rebuilds; rejected. Hand-rolled SVG line + donut/bars.

## Value sources by vertical (today)
Trading cards only: TCGPriceLookup search valueCents + CardSight pricing
in enrich. Timepieces thewatchapi = spec sheet only, no prices on our
tier's fields (asking-price endpoints exist upstream but quota-starved).
Others: none. → refresh-value UI defers.

## Cheap SQL stats (all possible today)
Allocation (exists) · spend-vs-value sums · per-collection SUM ·
top movers v1 (current − purchase) · acquisition timeline
(acquired_at/created_at by month) · grading distribution (guarded
json_extract '$.grade' — pattern proven in query tests).

## Late-breaking inputs (2026-08-17)
- TCG key: 98 req/day — permanent lookup cache makes it moot.
- Books covers verified mapped end-to-end (cover_url→imageUrl,
  books.ts adapter :50); outage had masked it. New ask folded in:
  author-photo placeholder in book item view.
