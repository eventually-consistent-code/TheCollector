# Phase 3: Vertical templates — Context

## Locked decisions

- **Templates are code, not data** (v1): TS definitions in `src/templates/`,
  one per vertical + a minimal `other`. User-defined templates are a later
  milestone; shipping 8 curated verticals now.
- **Field def shape**: `{ key, label, type, options?, placeholder? }` with
  types `text | number | date | money | select | boolean`. No dependent
  selects (grade validation per company deferred — RESEARCH risk 1).
- **Values live in `custom_fields` JSON** keyed by field key; value types
  string | number | boolean. No schema migration — phase-1 column already
  exists.
- **Shared keys across templates** (per RESEARCH conventions): the
  `grade`/`grading_company`/`cert_number` trio, `status`, `release_year`,
  `condition`. Same key ⇒ same semantic; options are template-owned.
- **Open sets are text, closed standards are select** — selects only for
  decades-stable scales (Goldmine, CGC companies, fill levels, formats,
  regions, completeness ladders).
- **Subtitle field**: each template names one field (or pair) for list-row
  subtitles (cards: set+number; comics: series+issue; vinyl: artist; games:
  platform; movies: format+edition; bourbon: distillery; lego: set_number;
  funko: series+pop_number).
- **Field keys anticipate phase-5 autofill** — keys match what
  Scryfall/ComicVine/Discogs/IGDB/TMDB/Rebrickable can populate; bourbon
  and funko are effectively manual verticals (autofill ~20%).
- **Vertical registry replaces the placeholder** `VERTICALS` list in
  schema.ts — collection create picks from the template registry; existing
  `other` collections keep working (generic template).
- **UI**: ItemForm gains a template-driven section below the common fields;
  item screen shows filled custom fields; collection rows use the
  template's subtitle field. No redesign of existing screens.
