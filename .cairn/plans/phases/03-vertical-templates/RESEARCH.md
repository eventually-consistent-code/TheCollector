# Phase 3 — Research brief (2026-08-12)

Domain pass: what collectors actually track per vertical, grading standards,
and what phase-5 metadata sources can auto-fill. Full field tables live in
the templates themselves (`src/templates/`); this file keeps the reasoning.

## Grading/condition standards (primary per vertical)

- **Trading cards**: raw = TCGplayer NM/LP/MP/HP/Damaged; slabbed = PSA 1–10
  (half grades to 8.5, no 9.5). Alternates BGS/CGC/SGC.
- **Comics**: CGC 10-point in fixed steps (0.5…9.0, 9.2, 9.4, 9.6, 9.8,
  9.9, 10.0). CBCS same numbers.
- **Vinyl**: Goldmine scale (M/NM/VG+/VG/G+/G/F/P) applied TWICE — media and
  sleeve separately. Also exactly Discogs' marketplace scale.
- **Video games**: completeness ladder (Sealed/CIB/…/Loose/Digital) + coarse
  condition; slabs = WATA/VGA.
- **Movies/discs**: no industry scale — Sealed/Like New/Good/Acceptable/Poor.
- **Bourbon**: Sealed/Opened/Empty + fill level (Full/Into Neck/Top
  Shoulder/Mid/Low Shoulder — auction-house standard). No grading body.
- **Lego**: NISB → Parts Only ladder; BrickLink New/Used maps onto it.
- **Funko**: in-box/out-of-box + box condition — the box is the value.

## Cross-vertical conventions (drive the shared keys)

- `grade` (number) + `grading_company` (select) + `cert_number` (text):
  identical trio in cards/comics/games — enables a cross-vertical "graded
  items" view later. Always manual.
- `status`: sealed/opened/completeness ladder shared by games, bourbon,
  Lego, Funko (options template-owned).
- `release_year` everywhere; `variant`/`edition` concept in cards, comics,
  movies, Funko.
- Open sets (platform, theme, rarity, exclusivity) = TEXT; only
  decades-stable scales (Goldmine, fill levels, formats, regions) = SELECT.

## Autofill reality (phase-5 planning input)

| vertical | source | coverage |
|---|---|---|
| vinyl | Discogs | ~90% — strongest |
| lego | Rebrickable | ~90% (status/box manual) |
| cards | Scryfall/PokéTCG | high (condition/grade manual) |
| comics | Comic Vine | good (variants spotty) |
| games | IGDB | work-level only — copy fields manual |
| movies | TMDB | film-level only — format/edition manual (biggest gap) |
| funko | kennymkchan dataset | title/series/image ONLY — no pop_number/exclusivity |
| bourbon | whiskey-api prototypes | ~20%, treat as manual vertical |

Sources describe the WORK, not the COPY — condition/completeness always
manual. Don't design add-item UX assuming autofill parity.

## Design risks

1. Grade scales aren't uniform numbers (CGC steps, PSA no 9.5, WATA 0.2
   steps) — `number` field admits impossible grades; per-company validation
   needs dependent selects we don't have. Ship number, validate later.
2. Metadata sources' work/copy gap (above) — phase-5 mapping must not force
   fields a source can't fill.
3. Select lists that are secretly open sets — hard-coded selects break when
   a new console/exclusive ships; text where the set is unbounded.
