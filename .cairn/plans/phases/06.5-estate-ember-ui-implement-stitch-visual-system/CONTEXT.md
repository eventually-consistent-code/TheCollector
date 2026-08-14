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
- **Fonts:** Libre Caslon Text + Geist via expo-font/@expo-google-fonts;
  verify Geist availability there at plan time (fallback: Inter or system).
