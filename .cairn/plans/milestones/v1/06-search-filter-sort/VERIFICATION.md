# Phase 6 Verification — Search, filter, sort

Date: 2026-08-14
Verdict: **PASS**

## Goal-backward check

Phase promise (REQ-08): find items across collections by free text,
template field values, and tags; sortable; fully offline against the local
PowerSync store.

| Promise | Evidence |
|---|---|
| Free-text cross-collection search | `useSearchItems` — LIKE over name/notes + `json_each(custom_fields)` values (never keys) + tags; global search screen with debounce, labeled results, empty states. Device UAT: found items across collections, tap-through works |
| Offline | Wi-Fi-off UAT on the iOS sim: search/filter/sort unaffected; sync indicator degraded and recovered on reconnect — all queries are local SQLite |
| Template-field filters | Pure `compileFilters` (select equality, one/two-sided ranges, boolean, tags) + template-driven chip UI. Device UAT on bourbon + trading cards test items: chips behave as expected |
| Tag search + filter | Tags column live (client + cloud), chip editor, tag facets. UAT found a real gap — global search never matched tags (clause existed only in the filter compiler). Traced (trace-4536c9f8 / #23), fixed bcfdd50, re-confirmed on device |
| Sort | ItemSort enum (name NOCASE, newest/oldest, value, acquired; NULLs pinned last) parameterizing useItems |

## Test suite

19 suites / 243 tests passing (180 at phase start); `tsc --noEmit` clean.
Db-backed tests execute the generated SQL on a real PowerSync database —
they caught two latent crashes before any device run (`json_extract` on
empty-string custom_fields; `json_each` on empty-string tags — both now
`json_valid`-guarded) plus proved the tag-search fix.

## Tracker

#8 (REQ umbrella) + #19–#22 closed with evidence; trace #23 closed with
verdict. No TDD-flagged tasks. Dev-client note: the iOS sim runtime rotated
since phase 5, requiring a one-time `expo run:ios` rebuild before UAT.

## Deviations (accepted)

- Issue #8's WatermelonDB wording was stale — PowerSync is the store;
  corrected on the issue with a dated note.
- FTS5 deliberately skipped (PowerSync views can't host virtual tables;
  trigger recipe is standing maintenance) — LIKE + json_each is instant at
  collector scale. Escape hatch documented in RESEARCH.md.
- Visual styling remains scaffold-grade by design — Estate & Ember
  implementation is phase 6.5 (inserted this session).

## Follow-ups (non-blocking)

- Phase 6.5: Estate & Ember UI implementation (roadmapped).
- Insights screen decision (6.5 vs 7) at plan time.
