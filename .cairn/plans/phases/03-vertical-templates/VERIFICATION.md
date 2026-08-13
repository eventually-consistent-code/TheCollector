# Phase 3 — Verification (2026-08-13)

## Verdict: PASS

Goal-backward check against CONTEXT.md locked decisions and PLAN.md T1–T6.

## What was checked

| Promise (CONTEXT.md) | Evidence |
|---|---|
| Templates as code, 8 verticals + other | `src/templates/definitions.ts` — nine templates, field tables per RESEARCH.md |
| Field def shape, six types, no dependent selects | `src/templates/types.ts`; renderer handles all six (`template-fields.tsx`) |
| Values in custom_fields JSON, no migration | verified in Postgres: `{"proof":90,"store_pick":true,"msrp":5999,…}` — types intact through sync |
| Shared keys (grade trio, status, release_year) | registry test asserts grade + grading_company present in all three slabbed verticals |
| Open sets text / closed standards select | encoded per template; registry test enforces selects carry options |
| Subtitle field per template | list row shows "Buffalo Trace · $250.00"; unit tests for join/missing/none |
| Registry replaces VERTICALS; old collections keep working | `templateFor()` falls back to `other`; phase-1 "Android Vinyl" (other) renders fine |
| ItemForm template section + edit prefill | web walk: all six types entered, saved, and rehydrated on edit (switch state, cents→dollars) |

## Live verification

- **Web**: bourbon item full entry (text/select/number/money/boolean),
  saved, subtitle on list row, edit screen prefilled, custom_fields synced
  to Postgres with correct JSON types.
- **Android** (emulator): vinyl template rendered natively — dual Goldmine
  chip rows (M…P twice), format select, all fields present.
- **iOS** (simulator): new bundle boots synced; template code is shared JS,
  platform-specific risk none beyond render (covered).

## Gates

- Tests: 53/53 (registry invariants, serialization round-trip, subtitle,
  quiet-logger). Typecheck clean.
- `plan_drift`: only #4 closed-pre-verification — resolved by this file.
- Open issues in phase 3: none.
- TDD frontmatter: none declared.

## Deviations / discoveries

- Money template fields reformatted per keystroke ("5.01.99") — fixed with
  a raw-text buffer (90ea27b commit range).
- Mid-phase trace (trace-216bf46a, unrelated to templates): overnight
  RSocket close noise was self-healing reconnects; benign closes now log
  at warn (76956a6). Zero sync downtime confirmed.
- Grade fields accept any number (PSA has no 9.5, CGC steps) — per-company
  validation deferred by design (CONTEXT/RESEARCH risk 1); revisit if
  graded-item features land.

Commits: 8c83776..76956a6 · #4 closed with evidence, ~50m logged.
