---
issues: [31, 32, 33, 34]
wave_1: [31]
wave_2: [32, 33, 34]
---
# Phase 6.7: App Shell — tabs, Dashboard, Profile, collection cover art — Plan

## Tasks

<!-- tasks; frontmatter 'issues' lists the tracker ids this plan advances -->

Decisions locked in CONTEXT.md (tabs shape, picker-first global scan,
auto-cover, Insights placeholder); router/data map w/ citations in
RESEARCH.md.

### Wave 1 — structure

- **#31 — Tabs + center Scan + picker** (5 pts / ~120m): (tabs) group,
  vault move (only file move), raised scan button, collection picker,
  placeholder tab screens. Everything else builds on this.

### Wave 2 — fill the tabs (need #31)

- **#32 — Dashboard** (5 pts / ~120m): portfolio hero, vertical grid,
  recently-cataloged strip w/ thumbs — three watch queries, db-tested.
- **#33 — Profile + Insights placeholder** (3 pts / ~90m): account/sync/
  sign-out; styled Insights stub awaiting phase 7 data.
- **#34 — Auto cover art** (2 pts / ~60m): cover_uri scalar subquery on
  vault cards, brass-framed, diamond placeholder.

### Verification shape

Suite green + tsc clean; device UAT: tabs navigate, stacked screens push
over the bar, back anchors to tabs, scan button → picker → camera,
Dashboard numbers match the vault, covers render, Profile signs out.
Total: 15 pts / ~6.5h.
