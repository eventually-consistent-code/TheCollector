# Phase 6.5 Verification — Estate & Ember UI

Date: 2026-08-16
Verdict: **PASS**

## Goal-backward check

Phase promise: the app wears the Estate & Ember design system end-to-end on
the current Stack (tab-bar App Shell explicitly cut to phase 6.7).

| Promise | Evidence |
|---|---|
| Token system + dark-only | theme.ts owns the full palette (charcoal/slate/brass/hunter/amber/vellum) + Type scale; legacy semantic keys remapped so every consumer converted; web pre-hydration light flash fixed |
| Typography | Libre Caslon Text + Geist loaded via @expo-google-fonts behind the splash gate; ThemedText swapped to per-weight families — serif titles + Geist body confirmed on device |
| Screens restyled | Lists (tray cards, amber values, plaque sync strip), search + all forms (StationeryInput system, chip pickers, serif auth wordmark), scan (gold-frame viewfinder, deep-slate match cards) — device UAT pass |
| Brand assets | Heraldic shield icon (user-confirmed on sim home screen), charcoal splash, favicon, Android adaptive set; template cruft removed |
| Item imagery (UAT addendum #30) | Brass-framed thumbnails on rows + search via first-photo scalar subquery (no N+1), placeholder for photo-less items — device UAT pass |
| Hex gate | 6 hex lines outside theme.ts, all commented semantic locals (error red ×3, sync dots ×2 — the scan line is a comment); gate passes |

## Test suite

20 suites / 252 tests passing (243 at phase start); `tsc --noEmit` clean.

## Traces (both closed with verdicts)

- trace-2dbbc88f / #29: icon/splash absent after rebuild — two-part cause:
  stale gitignored native projects (expo run:ios reuses them; prebuild
  --clean required after app.json asset changes) AND a template `ios.icon`
  liquid-glass composition overriding the root icon. Fixed 2cd9b8a;
  user-confirmed on device.
- Sim-only cosmetic: iOS launch-snapshot cache replays the old splash ~1s
  on first launches after upgrade-in-place; clean reinstall clears it. Not
  a build defect.

## UAT findings routed out of phase (by design)

- No Dashboard on open / no tab shell / no collection cover art → phase
  6.7 (roadmapped, tracker #10) — new IA, never 6.5 scope.

## Deviations (accepted)

- `link` text type is amber globally (mock language), not only auth links.
- Card padding stepped 24→16 on item rows to hold mock density with 60px
  thumbnails.

## Operational note

After any app.json asset/icon change: `npx expo prebuild --clean` before
`expo run:ios`, or the change never reaches the binary.
