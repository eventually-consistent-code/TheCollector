# Phase 7 Verification — Value tracking + stats

Date: 2026-08-17
Verdict: **PASS**

## Goal-backward check (REQ-09)

| Promise | Evidence (layer-tagged) |
|---|---|
| Purchase/current value fields | Pre-existing columns; crud-covered |
| Per-collection totals | UI: header value plaque + cost-basis ± delta; API: SUM db-tested (isolation, NULLs). Device UAT pass |
| Overall totals | Dashboard hero (phase 6.7) + Insights plaque w/ gain/loss chip |
| Value over time | Data: item_value_history synced table — client schema, cloud DDL + own-rows RLS applied and verified, PowerSync stream deployed (John, dashboard). Crud appends on create-with-value / changed-value only. UI: baseline-seeded stepwise line (amber/hunter/brass), day-bucketed, carried forward; empty state honest. Device UAT: value edit grows the line |
| Counts/stats | Allocation bars (donut rejected — muted palette fails adjacent-wedge separation; labeled bars keep identity off color-alone), top movers w/ thumbs, 12-month acquisition timeline, cost-basis tiles |
| Pricing sources (in-phase bonus) | #41 TCGPriceLookup: images + condition-ladder TCGplayer prices, cached, live-verified ($852 NM Charizard); 98 req/day quota moot under the permanent lookup cache |
| Source-link persistence | items.source/source_id thread from picks; enabler for future re-pricing (refresh action deliberately deferred — one price-capable vertical) |
| Books author presence (John's ask) | Monogram AuthorBadge beside the books-only author field; OLID live-photo follow-up noted. Device UAT pass |

## Test suite

31 suites / 403 tests passing (341 at phase start); `tsc --noEmit` clean.
Series builders, chart math, and all new SQL are unit/db-tested.

## Cloud

DDL applied + RLS verified on the linked project; publication membership
added; user_item_value_history stream deployed via PowerSync dashboard.
react-native-svg = the phase's only new dependency (one dev-client
rebuild, done pre-UAT).

## Tracker

#9 umbrella + #41/#44–#47 closed with evidence; no TDD-flagged tasks.

## Deviations (accepted)

- Allocation = bars, not the mock's donut (contrast-driven; documented).
- Grading distribution stretch not taken.
- History accrues from ship date — the table-now decision exists exactly
  to stop losing data.

## Follow-ups (non-blocking)

- OLID → live author photos (thread author_key through BookHit).
- Per-item "refresh value" action once ≥2 verticals have price sources.
- #39 datalake + #42 photo appraisal: phase 8 candidates.

## Addendum (2026-08-17, post-initial-verify)

#48 offline image backfill added and closed in-phase: pending_image_url
persistence + reconnect sweeper (pending url → CardSight sentinel →
guarded name-match), cloud column applied and verified, suite 430/430,
tsc clean. Device UAT of the reconnect path rides the next session's
smoke (mechanism fully unit/db-tested; sweep is silent + capped).
