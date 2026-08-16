# Phase 6.7: App Shell — tabs, Dashboard, Profile, collection cover art — Context

## Locked decisions

<!-- decisions made for this phase; on conflict these WIN over tracker issue text -->

- **Tabs**: `(app)/(tabs)/_layout.tsx` <Tabs> inside the existing (app)
  Stack; only `(app)/index.tsx` moves (→ `(tabs)/vault.tsx`); collection/
  item/search routes stay stacked over the bar; `anchor: '(tabs)'` set.
  Tab bar styled Estate & Ember: deep-slate bar, brass hairline top,
  amber active tint.
- **Center Scan button**: dummy route + custom tabBarButton (raised
  hunter circle, amber ring) + tabPress preventDefault → collection
  picker modal → existing `/collection/[id]/scan`; picker auto-skips when
  exactly one collection exists. Scan-first rejected — the vertical picks
  the metadata adapter before lookup.
- **Dashboard** (tabs index, mock: Stitch Dashboard screen e7a803de): total
  portfolio value hero (amber serif figure), per-vertical grid (count +
  value per vertical, tray-card tiles), "Recently Cataloged" strip (5
  newest w/ thumbnails), quiet synced line. Three one-statement watch
  queries — no new tables.
- **Cover art**: AUTO-cover only this phase — latest renderable item photo
  per collection via scalar subquery (`cover_uri` on the vault list query);
  zero schema/sync surface. Override column deferred.
- **Profile**: email, live sync state (absorbs SyncStatusBar's role +
  sign-out), collection/item counts, app version. Vault keeps a slim sync
  indicator only if it costs nothing.
- **Insights**: placeholder tab this phase ("charts arrive with value
  tracking"), styled, non-empty-feeling; real charts land with phase 7
  data.
