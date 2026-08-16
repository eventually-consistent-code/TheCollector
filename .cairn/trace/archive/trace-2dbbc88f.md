---
status: resolved
issue: 29
created: 2026-08-16
resolved: 2026-08-16
---
# Trace: New icon/splash absent after expo run:ios rebuild — gitignored ios/ + android/ native projects were generated at phase-5 prebuild and expo run:ios reuses them; app.json icon/splash changes from #28 never sync without a fresh prebuild

## verdict — 2026-08-16
Two-part cause. (1) Gitignored ios/ + android/ were generated at the phase-5 prebuild; expo run:ios reuses existing native projects, so #28's app.json asset changes never synced — fixed by `npx expo prebuild --clean`. (2) Deeper: app.json carried a template `ios.icon: ./assets/expo.icon` liquid-glass composition (Expo symbol on blue gradient) which OVERRIDES the root icon on iOS — even a fresh prebuild produced the template mark (empty/none appiconset first, template comp after). Removed the override + template dir (commit 2cd9b8a); prebuild now bakes the heraldic 1024 icon (byte-verified our shield) and the #121212 splash colorset. Dev-client rebuild running; user re-check pending.

## resolution — 2026-08-16
Fixed in 2cd9b8a (template ios.icon override removed + prebuild --clean workflow); user confirmed shield icon + charcoal splash on device after clean reinstall.
