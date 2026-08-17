---
status: resolved
issue: 37
created: 2026-08-17
resolved: 2026-08-17
---
# Trace: Process defect: assistant asserted a nonexistent app capability during UAT guidance — told the user to use a "manual/text entry path" on the scan screen to look up the Griffey card, but scan.tsx's manual mode is barcode-digits-only (number-pad → handleBarcode). No text search existed anywhere in the app UI. Understand why and design a guard.

## evidence — 2026-08-17
What was claimed (twice): (1) "#35 UAT: scan something... or use the Griffey card lookup"; (2) "open a trading-cards collection → Scan → the manual/text entry path → type '1989 Upper Deck Ken Griffey Jr'". What the code shows (scan.tsx): manualCode state w/ keyboardType="number-pad" feeding handleBarcode() — barcode digits only; grep confirms zero searchByText call sites in any screen. Three separate sources got conflated into a false capability: (a) the Stitch Scan-to-Add mock has a "Barcode / Photo / Manual" mode switcher — design artifact, never implemented; (b) the phase-5 CardSight "live test (Griffey)" was a curl against the deployed edge function, not the app UI; (c) adapters DO expose searchByText — at the API layer, with no UI caller. Each fact was true in its own layer; the claim stitched them into a UI feature that does not exist. Contributing factor: UAT instructions were composed from session memory of capabilities without a code-level check of the specific UI affordance being referenced — the same mock-vs-app conflation the user already hit once this phase ("none of the stitch graphical changes are there").

## verdict — 2026-08-17
Root cause: layer conflation under recall pressure — mock capabilities (Stitch), API capabilities (edge fn/adapters), and UI capabilities (screens) live at three layers with different truth values, and UAT guidance was written from blended session memory instead of the bottom layer. The Griffey test being genuinely real (at the curl layer) made the false UI claim feel verified. Fix (working agreement, effective now, mirrored as a durable memory card): (1) UI-claim gate — before naming any tappable/typeable affordance in UAT steps or user guidance, grep/read the screen file for that affordance; if unverified, say the layer it's verified at ("the adapter supports X; the UI path is Y") instead of upgrading it. (2) Layer-tagging in phase artifacts — capability claims in ledgers/verifications name their layer (mock / API / UI), which VERIFICATION.md for 5.5 partially did (adapters "live-tested" = API layer) but UAT prose dropped. (3) Standing lesson card in cairn memory so future sessions inherit the rule. Immediate remediation already shipped: correct path (#36 type-ahead) built as the real text-search UI. Applied and closing.

## resolution — 2026-08-17
Root cause: mock/API/UI layer conflation in UAT guidance. Fix: UI-claim gate working agreement (grep the screen before naming an affordance; layer-tag capability claims), durable lesson card gotcha-7a484389, remediation already built (#36 real text-search UI).
