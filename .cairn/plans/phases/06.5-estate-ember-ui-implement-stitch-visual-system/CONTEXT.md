# Phase 6.5: Estate & Ember UI — implement Stitch visual system — Context

## Locked decisions

<!-- decisions made for this phase; on conflict these WIN over tracker issue text -->

- **Reference:** Stitch project "The Collector Unified Platform"
  (10619147081399329079), design system Estate & Ember
  (assets/4f9c99fcb6fc42cbae8779c9ec90c552). Mocks set direction and
  component language — not pixel contracts. Screens: Dashboard, The Winder
  (e28663a3), Watch Detail (24494414), The Humidor (7febb1a0), Cigar Detail
  (7c8ed1ac), The Library, The Toy Box, Vinyl Detail, Art Detail, Insights,
  Scan overlay, Sign In. Each screen's HTML is downloadable via the Stitch
  MCP for token extraction.
- **Tokens (from the design-md):** charcoal #121212 base, deep-slate #1A1A1A
  cards, brass #504532 1px hairlines, hunter-green #355E3B primary, rich
  amber #FFBF00 value accents, vellum #E5E2E1 text; Libre Caslon Text
  (headers/serif) + Geist (UI/data); 4px base spacing; card radius 8px,
  control radius 4px; letterspaced caps labels.
- **Personal-inventory CTAs only** — no marketplace/bid actions regardless of
  what any mock shows (standing decision from phase 5.5).
- **Insights screen is new scope** (mock exists, no app screen yet) — decide
  at plan time whether it lands here or with phase 7 value tracking, since
  its charts need phase 7 data.
- **Fonts:** `@expo-google-fonts/libre-caslon-text` (v0.4.0) +
  `@expo-google-fonts/geist` (v0.4.2) — both verified on npm (Geist joined
  Google Fonts; no manual .ttf bundling). Loaded via `useFonts` in the root
  layout behind the existing splash-hold gate (no dev-client rebuild
  needed); web gets the families through global.css vars.
- **Scope cut (planning decision): the 5-tab App Shell is NOT in 6.5.**
  Dashboard, Insights, and Profile screens don't exist, and global Scan is
  a product question (scan is collection-scoped today) — that's new IA, not
  a restyle. 6.5 skins the current Stack completely; tabs + Dashboard +
  Insights become their own phase (candidate: fold into/alongside phase 7,
  whose value-tracking data the Insights charts need anyway).
- **Theme mechanism:** extend the EXISTING system — src/constants/theme.ts
  tokens + useTheme() + ThemedText/ThemedView. Dark ("drawing room") becomes
  the only real scheme; semantic keys grow (surface, surfaceRaised,
  hairline/brass, accent/hunter, highlight/amber, ink/vellum) + a Type
  scale. No theme context/provider — over-engineering at this size.
- **Web:** fix the pre-hydration light-flash (use-color-scheme.web.ts
  defaults light) as part of going dark-only; update global.css font vars
  and load real webfonts.
- **Brand assets:** no heraldic mark exists in-repo — export from the
  Stitch logo screens; regenerate icon/splash/favicon on charcoal #121212
  (splash is currently template blue #208AEF in app.json).
