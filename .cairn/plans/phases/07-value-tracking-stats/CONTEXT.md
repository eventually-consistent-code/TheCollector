# Phase 7: Value tracking + stats — Context

## Goal

REQ-09 delivered for real: value history over time, Insights tab alive
with charts and stats, per-collection totals. Purchase/current value
fields already exist; Dashboard already sums them.

## Locked decisions

<!-- decisions made for this phase; on conflict these WIN over tracker issue text -->

- **item_value_history ships NOW** — synced user table (id, user_id,
  item_id, value_cents, recorded_at, source), appended by crud on
  create/update when current_value_cents changes. Every phase without it
  is chart data lost forever. Full additive-synced-table checklist (the
  photos precedent): schema.ts + supabase DDL + own-rows RLS + a new
  sync-streams.yaml stream (dashboard deploy needed — lookup_cache was
  server-only and is NOT the pattern).
- **Chart left edge seeds from the baseline** (purchase_price at
  acquired_at/created_at) so day-one charts aren't a single dot.
- **source/sourceId persist on save** (enabler for future re-pricing) —
  nullable columns; columns need no stream change. The per-item
  "refresh value" ACTION defers — only trading cards has a price source.
- **Charts: react-native-svg + hand-rolled** (amber line, hunter fill,
  donut/bars per the Insights mock). victory/skia rejected — heavy native
  dep, dev-client rebuilds both platforms, Android build pain on record.
  One new dep, one rebuild.
- **Insights v1 stats**: portfolio value line (history + baseline),
  allocation by vertical, cost basis vs value w/ gain/loss, top movers v1
  (current − purchase; history-based movers later), acquisition timeline.
  Grading distribution = stretch (SQL pattern proven).
- **Per-collection value total** surfaces on the collection header.
- **TCGPriceLookup quota**: key is 98 req/day (John, 2026-08-17). The
  permanent text-query cache means one upstream call per unique query
  ever — fine; no throttle code. 429s would surface as the sanitized
  hint. Key transited chat — rotate at leisure.
- **Books UX (John's ask)**: cover lookup already works end-to-end
  (cover_url→imageUrl mapped; the outage masked it — failover fixed).
  This phase adds an AUTHOR PHOTO PLACEHOLDER in the book item view
  (elegant deep-slate monogram circle beside the author field); live
  author-photo fetch (Open Library /a/olid/ covers) is an enhancement
  behind it when cheap, never blocking.
