# Phase 6.5 — Estate & Ember restyle research (2026-08-14)

Codebase + npm verified. Full detail in the planning session; the
load-bearing facts:

## Styling today
- Plain StyleSheet.create in 12 files; NO css-in-js/NativeWind.
- A real token system already exists: src/constants/theme.ts
  (Colors.light/dark w/ 5 semantic keys, Fonts w/ Platform.select + web
  CSS vars from src/global.css, Spacing, BottomTabInset, MaxContentWidth),
  delivered via useTheme() + ThemedText/ThemedView. The phase is mostly
  re-pointing values and extending the token set — not building plumbing.
- Hex stragglers in 12 files, mostly 1–3 each. Estate & Ember hexes already
  duplicated locally in item-filter-bar.tsx:27-29, tag-chips.tsx:18-19,
  search.tsx:25-26 — first consolidation targets. Link blue in
  themed-text.tsx:66; template splash blue #208AEF in app.json.

## Restyle surface (~2,200 UI lines)
Big: search.tsx (196), collection/[id]/index.tsx (198), scan.tsx (211),
item-filter-bar (246), template-fields (166), photo-section (136),
form (123), tag-chips (121), item-form (107).
Trivial: auth screens (70 ea), index.tsx (103), item/[id] (69), new.tsx,
new-item.tsx, layouts, sync-status, item-photo, themed-*.

## Navigation reality
Plain Stack w/ Stack.Protected auth gate; expo-router ThemeProvider already
wired in root layout (inject a custom nav theme there). No Dashboard (index
IS the collections list), no Profile (sign-out lives on SyncStatusBar), no
Insights. BottomTabInset token + template tabIcons/ exist but unused.
→ Tab shell = new IA, cut from this phase (locked in CONTEXT.md).

## Fonts
expo-font ~57.0.1 installed. @expo-google-fonts/libre-caslon-text v0.4.0
and @expo-google-fonts/geist v0.4.2 both real (geist-mono v0.4.3 too).
SDK 57: useFonts in root layout behind the existing splash-hold `ready`
gate — works on web, no dev-client rebuild (config-plugin embedding would
require rebuilds; skip).

## Web flags
- global.css font vars currently Spline Sans/Georgia — must update + load
  real webfonts.
- use-color-scheme.web.ts defaults LIGHT pre-hydration → light flash under
  a dark-only scheme; flip/remove with the dark-only move.

## Assets
assets/images/ is Expo template stock. No heraldic mark — export from the
Stitch logo screens (Brand Logo 1d0a7dcb, Monogram Heraldic c82790a2,
Drawing Room 1ddf8975); regen icon/splash/favicon on #121212.

## Adopted order
Tokens+fonts+shell chrome first (one foundation issue), then screens by
traffic: lists → search/filters → item form stack + auth → scan overlay;
brand assets parallel.
