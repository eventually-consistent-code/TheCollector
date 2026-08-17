---
issues: [9, 41, 44, 45, 46, 47, 48]
wave_1: [44, 46, 47]
wave_2: [45]
---
# Phase 7: Value tracking + stats — Plan

## Tasks

<!-- tasks; frontmatter 'issues' lists the tracker ids this plan advances -->

Decisions in CONTEXT.md (history table now, baseline seeding, svg-only
charts, source-link persistence, refresh-action deferral, TCG quota note,
books author placeholder); map in RESEARCH.md. #9 = REQ umbrella (closes
at verify); #41 (TCGPriceLookup) already closed in-phase.

### Wave 1 — data + small UI (independent)

- **#44 — item_value_history + source link** (5 pts / ~120m): synced
  table end-to-end (cloud DDL by main session; sync-stream deploy is a
  dashboard step to flag at verify), crud append-on-change, source/
  source_id columns threaded from picks.
- **#46 — Collection value total** (2 pts / ~45m): SUM on the header +
  cost-basis subline.
- **#47 — Author placeholder** (2 pts / ~60m): monogram circle beside the
  book author field; live OL photo only if the payload already carries an
  OLID cheaply.

### Wave 2 — Insights (needs #44)

- **#45 — Insights live** (8 pts / ~180m): react-native-svg; value line
  (history + baseline seed), allocation, gain/loss tiles, top movers v1,
  acquisition timeline; grading distribution stretch.

### Verification shape

Db-backed tests for history append + sums + series builders; device UAT:
edit a value → history row → line moves; collection header total matches;
Insights charts render on iOS + web; author placeholder shows. Note:
react-native-svg needs a dev-client rebuild (`prebuild` not required —
autolinked; `expo run:ios` once). Total new estimate: 17 pts / ~7h.
