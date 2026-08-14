---
status: resolved
issue: 23
created: 2026-08-14
resolved: 2026-08-14
---
# Trace: Global search does not match tags — buildSearchQuery searches name/notes/custom_fields values only; items.tags never included, so a saved tag is unfindable from the search screen (REQ-08 requires tag search)

## evidence — 2026-08-14
Confirmed at src/db/query.ts:67-80 — buildSearchQuery WHERE covers items.name, items.notes, json_each(items.custom_fields) only. No items.tags clause exists anywhere in the search path (tags EXISTS clause lives only in compileFilters). UAT repro: tag saved on item (verified in db), global search for the tag string returns nothing. ≤3-line fix: add a json_valid-guarded json_each(items.tags) LIKE branch + fourth param.

## test — 2026-08-14
Fix bcfdd50: json_valid-guarded json_each(items.tags) LIKE branch added to buildSearchQuery (4th param). Db-backed tests: tag "grail" and partial "first press" find the item; empty-string tags skipped without throwing. Suite 243/243, tsc clean. Awaiting UAT re-check on device (reload app, search the saved tag).

## verdict — 2026-08-14
Cause: buildSearchQuery (src/db/query.ts) never included items.tags — the tags clause existed only in compileFilters, so global search couldn't match saved tags despite REQ-08 naming tag search. Fix: json_valid-guarded json_each(items.tags) LIKE branch + fourth bound param, commit bcfdd50. Proven by db-backed tests (tag hit, partial-tag hit, empty-string tags skip without throwing; 243/243) and user-confirmed on the iOS simulator.

## resolution — 2026-08-14
Fixed in bcfdd50; device-confirmed by user on iOS sim.
