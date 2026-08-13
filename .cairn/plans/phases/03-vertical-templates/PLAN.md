---
issues: [4]
depth: standard
---
# Phase 3: Vertical templates — Plan

## Tasks

Advances #4 (REQ-04). Registry first, then rendering, then wiring.

- [ ] T1 — Template model + registry: `src/templates/types.ts` (FieldDef,
      Template), one file per vertical with the RESEARCH.md field tables
      (8 + `other`), `src/templates/index.ts` registry keyed by vertical.
      Replace schema.ts `VERTICALS` with registry-derived list.
- [ ] T2 — Field renderer: `src/components/template-fields.tsx` — renders a
      template's FieldDefs (text/number/date/money reuse Field; select →
      ChipPicker; boolean → switch row) bound to a values object.
- [ ] T3 — Wire ItemForm: template resolved from the collection's vertical,
      custom-fields section under the common fields, values serialized
      into `custom_fields` on save, prefilled on edit.
- [ ] T4 — Display: collection rows use the template subtitle field
      (fallback: current value); item screen lists filled custom fields.
- [ ] T5 — Tests: registry invariants (unique keys per template, selects
      have options, subtitle keys exist), value serialization round-trip
      through createItem/updateItem, subtitle resolution.
- [ ] T6 — Verify: web walk (create vinyl item with Goldmine grades,
      bourbon bottle with fill level), sync round-trip of custom_fields to
      Postgres, quick Android/iOS render check.
