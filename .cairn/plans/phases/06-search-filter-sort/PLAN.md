---
issues: [8, 19, 20, 21, 22]
wave_1: [19, 20]
wave_2: [21, 22]
---
# Phase 6: Search, filter, sort — Plan

## Tasks

<!-- tasks; frontmatter 'issues' lists the tracker ids this plan advances -->

Architecture locked in CONTEXT.md (LIKE + json_each, template-driven
filters, sort enum, new tags column); codebase map with citations in
RESEARCH.md. #8 is the umbrella requirement — closes at verify when the
four tasks prove out end-to-end.

### Wave 1 — data + query layer (independent)

- **#19 — Tags end-to-end** (3 pts / ~75m): items.tags column moved as one
  change across client schema, supabase/schema.sql (+ cloud apply),
  replication, crud lists; tag chip editor on the item form; display on
  item detail. Querying stays in #20.
- **#20 — Query layer** (5 pts / ~120m): `useSearchItems` (LIKE over
  name/notes + json_each values), pure-function filter compiler from
  template field defs (select → equality, number → range, tags → EXISTS),
  sort enum parameterizing `useItems`. Unit tests per clause type + sort.

### Wave 2 — UI (needs wave 1)

- **#21 — Global search screen** (3 pts / ~90m): `search.tsx` Stack route +
  header entry point, debounced stationery-style field, cross-collection
  results labeled by vertical, tap-through, empty states.
- **#22 — Collection filter/sort UI** (5 pts / ~120m): ListHeaderComponent
  grows a sort selector + template-driven chip groups/ranges + tag chips;
  hunter-green active / brass-outline inactive; clear-all; result count.

### Verification shape

Unit: filter compiler + sort + search semantics (values-not-keys). Device
UAT: bourbon + trading cards collections exercise template-driven filters;
global search finds items across collections offline; tags round-trip
create → filter. Total estimate: 16 pts / ~6.75h.
