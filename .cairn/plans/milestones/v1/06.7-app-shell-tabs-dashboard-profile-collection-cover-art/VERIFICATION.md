# Phase 6.7 Verification — App Shell

Date: 2026-08-16
Verdict: **PASS**

## Goal-backward check

Phase promise: the mock App Shell becomes real — tabs, Dashboard, Profile,
global Scan, collection cover art. Grew three UAT-driven additions along
the way (#35 lookup images, #36 type-ahead, #40 item hero).

| Promise | Evidence (layer-tagged) |
|---|---|
| Bottom tabs + center Scan | UI: Dashboard / Collections / raised hunter-amber Scan disc / Insights / Profile; stacked routes push over the bar; deep-link anchor set. Device UAT pass |
| Dashboard | UI: portfolio hero, per-vertical grid, recently-cataloged rail w/ thumbs, empty invitation; API: three watch queries db-tested. Device UAT: numbers match test items |
| Global Scan | UI: center button → collection picker (auto-skip w/ one collection) → existing scan route. Device UAT pass |
| Profile + Insights placeholder | UI: account/sync/counts/version/two-tap sign-out; styled Insights stub. Device UAT pass |
| Collection cover art | UI+API: cover_uri scalar subquery on vault cards, db-tested isolation/ordering. Device UAT pass |
| Lookup images (#35) | Full chain device-confirmed: adapter imageUrl → save-time fetch → first photo → thumbnails/covers/rail |
| Type-ahead pick-to-fill (#36 + trace-e5ba6226) | Device-confirmed after three stacked fixes: in-flow popover (iOS touch clipping), base64 image transport (RN Blob lacks arrayBuffer), un-raced enrichment + CardSight detail/pricing ops — picks fill name/set/year/card#, estimate median sales comps into Current Value, image saves |
| Item hero (#40) | UI: brass-framed letterbox hero/pager leads the item screen, data below, notes close the ledger under their own heading. Device UAT pass |

## Test suite

26 suites / 322 tests passing (284 at phase start); `tsc --noEmit` clean.

## Cloud

Edge fn redeployed twice this phase (cardsight lookup/image/pricing ops);
image + pricing ops live-verified against the deployed fn with a real card
(JPEG bytes verified, 2,235 sales records parsed).

## Traces (closed with verdicts)

- trace-e5ba6226 / #38: type-ahead fill/image failures — three stacked
  causes (iOS touch clipping on absolute overhang, RN Blob.arrayBuffer
  absence, enrich race vs cold edge fn), each fixed and device-confirmed.
- trace-dea670a5 / #37: process case — UI-claim gate working agreement +
  lesson card (mock/API/UI layer separation).

## Deviations (accepted)

- Tab glyphs are dependency-free View-drawn icons (@expo/vector-icons is
  not an installed dependency despite the plan note).
- CardSight suggestion rows show no thumbnail (image is auth-gated;
  arrives at save time via the edge proxy). Scryfall/Pokémon rows show
  live thumbs.
- Tab label renamed The Vault → Collections at UAT.

## Follow-ups (non-blocking)

- Flip Vault's SyncStatusBar to showSignOut={false} now Profile owns
  sign-out.
- #39 backlog: community metadata datalake + LLM enrichment (phase 8
  candidate).
- Insights charts land with phase 7 value-tracking data.
