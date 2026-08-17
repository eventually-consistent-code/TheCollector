---
status: resolved
issue: 38
created: 2026-08-17
resolved: 2026-08-17
---
# Trace: Type-ahead pick fills nothing — popover shows results for "1989 Upper Deck Ken Griffey Jr" but selecting an option populates no template fields and saves no image (phase 6.7 UAT, #36)

## evidence — 2026-08-17
fillFromResult mapping and pickSuggestion handler are correct. Root cause is layout: NameLookupPopover is position:absolute top:'100%' inside the name-field anchor (nameAnchor, field-height) — the list renders below the anchor's frame. iOS hit-testing does not deliver touches to children outside their parent's bounds, so every row tap misses the popover and lands on the dismiss backdrop: popover closes, nothing fills, no image reported. Exactly matches UAT symptom (popover visible, selection appears to do nothing).

## verdict — 2026-08-17
Cause: NameLookupPopover was position:absolute top:'100%' inside the field-height name anchor — rendered outside the parent's frame, where iOS hit-testing delivers no touches; row taps fell through to the dismiss backdrop (popover closed, no fill, no image). Fill mapping and handlers were correct all along. Fix bee160c: popover renders in normal layout flow directly under the field (open list pushes the form down; taps land on all platforms). 284/284, tsc clean. Awaiting device re-test.

## evidence — 2026-08-17
Second UAT round (post bee160c): picks now land — created items carry lookup names + set subtitles — but fields stay sparse and no image. Live API interrogation: (1) cardsight search returns year/setName/releaseName/manufacturerName but mapCardSight (trading-cards.ts) maps ONLY set_name + variant — year/manufacturer discarded; (2) trading-cards template has no year field at all; (3) images require GET /v1/images/cards/{id} (confirmed via 401 route-probe + the MCP tool list's get_card_image) — auth-gated, key is server-side, and the edge fn only implements catalog/search, so NO image was ever reachable; (4) GET /v1/catalog/cards/{id} (confirmed 401) offers detail (card number, attributes) we never fetch. Two independent failures stacked on the earlier touch bug: mapper waste + missing image path.

## test — 2026-08-17
Enrichment merged (f881c5b) + edge fn deployed. Live-verified against the deployed fn with the real card UUID: op 'lookup' → {number:"1", releaseYear:"1989", setName:"Base Set", attributes:["RC"]}; op 'image' → HTTP 200 image/jpeg 12.9KB — visually confirmed as the 1989 Upper Deck Griffey rookie. Client now: mapper fills year/set (+ new template year field), pick enriches card_number from detail (3s race, base fill immediate), imageUrl sentinel cardsight-image:{id} resolved through supabase.functions.invoke → bytes → savePhoto. 308/308 tests, tsc clean. Awaiting device re-test.

## verdict — 2026-08-17
Three stacked causes, all fixed and device-confirmed: (1) popover absolute-positioned outside its anchor — iOS delivered no touches, taps hit the dismiss backdrop (fix bee160c: in-flow layout); (2) RN Blob lacks arrayBuffer() so the sentinel image bytes died silently — edge 'image' op now ships base64 JSON, pure client decoder (0251580); (3) 3s enrich race lost to cold edge-fn starts, discarding detail merges — race removed, merge applies whenever it lands; plus new 'pricing' op with median sales-comp estimate into Current Value (0251580, parser fixed to the live raw.records shape in e4fb021). User confirmed on device: fields fill, value estimates, image saves and shows in thumbnail + new hero.

## resolution — 2026-08-17
Fixed across bee160c / 0251580 / e4fb021 (touch layout, RN-safe base64 image transport, un-raced enrichment + pricing estimate); user confirmed full pick-to-fill with image and value on device.
