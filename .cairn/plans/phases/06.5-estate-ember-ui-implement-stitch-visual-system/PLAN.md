---
issues: [24, 25, 26, 27, 28, 30]
wave_1: [24, 28]
wave_2: [25, 26, 27]
---
# Phase 6.5: Estate & Ember UI — implement Stitch visual system — Plan

## Tasks

<!-- tasks; frontmatter 'issues' lists the tracker ids this plan advances -->

Scope: full Estate & Ember skin on the CURRENT Stack. The 5-tab App Shell
(Dashboard/Insights/Profile/global Scan) is explicitly cut — new IA, its
own phase (see CONTEXT.md). Codebase map in RESEARCH.md.

### Wave 1 — foundation (independent)

- **#24 — Tokens + fonts + chrome** (5 pts / ~120m): theme.ts grows the
  Estate & Ember semantic palette, dark-only; Caslon + Geist via
  @expo-google-fonts behind the splash gate; nav theme at the root
  ThemeProvider; web font vars + light-flash fix; splash color. Kills the
  three duplicated accent-hex blocks.
- **#28 — Brand assets** (2 pts / ~60m): heraldic mark from the Stitch logo
  screens → icon/adaptive/splash/favicon on charcoal; app.json wiring.

### Wave 2 — screens (need #24 tokens)

- **#25 — List screens** (5 pts / ~120m): collections index, collection
  detail, filter bar, sync strip → collector's-tray card language.
- **#26 — Search + forms + auth** (5 pts / ~150m): stationery search field,
  registration-ledger form inputs, chip pickers, auth wordmark screens.
- **#27 — Scan overlay** (3 pts / ~90m): gold-frame viewfinder + deep-slate
  match sheet per the Scan-to-Add mock; visual layer only.

### Verification shape

Suite stays green + tsc clean throughout (styling must not break logic).
Device UAT is the real gate: every screen visually coherent with the mocks
on iOS sim + web, fonts render (serif headers/Geist data), no light flash
on web, dark splash, zero remaining template-blue. `grep -rn "#[0-9a-fA-F]\{6\}" src/`
outside theme.ts should be ~empty. Total: 20 pts / ~9h.
