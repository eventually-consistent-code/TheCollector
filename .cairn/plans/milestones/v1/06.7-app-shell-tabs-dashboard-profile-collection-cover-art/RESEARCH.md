# Phase 6.7 — App Shell research (2026-08-16)

Codebase + expo-router 57 docs verified. Load-bearing facts:

## Router restructure (small!)
- Route tree lives under src/app/. Target: `(app)/_layout.tsx` keeps its
  Stack and gains a `(tabs)` screen (headerShown:false there — double-header
  gotcha) + `unstable_settings = { anchor: '(tabs)' }` for deep links;
  new `(app)/(tabs)/_layout.tsx` <Tabs>: index (Dashboard), vault, scan
  (dummy), insights, profile.
- ONLY file move: `(app)/index.tsx` → `(tabs)/vault.tsx` (it would collide
  with the new tabs index on `/`). Groups are URL-transparent — grep proved
  zero call sites link to `/`; `/collection/[id]`, `/item/[id]`, `/search`,
  `/collection/new` all keep working, stacked OVER the tab bar.
- Stack.Protected auth gate at root is unaffected.
- Carry the serif headerTitleStyle into Tabs screenOptions.

## Center scan button
- Dummy route `(tabs)/scan.tsx` (renders null) + custom `tabBarButton`
  (raised hunter circle w/ amber ring, overhanging the bar) + `listeners
  tabPress preventDefault → router.push`. `BottomTabInset`
  (theme.ts:114, ios 50 / android 80) already anticipates the bar.

## Dashboard data — three one-statement watch queries
- Totals: `SELECT COUNT(*), COALESCE(SUM(current_value_cents),0) FROM items`
- Per-vertical: collections LEFT JOIN items GROUP BY c.vertical
- Recent: `SELECT items.*, ${FIRST_PHOTO_URI_SQL} AS thumb_uri FROM items
  ORDER BY created_at DESC LIMIT 5` — FIRST_PHOTO_URI_SQL correlates on
  items.id, drops straight in. Hook pattern: bare useQuery per hooks.ts.

## Cover art — auto-cover, zero schema change
Scalar subquery on the collections list query (latest renderable item
photo per collection → `cover_uri`); ItemThumb/ItemPhoto already render a
bare local_uri from any screen (resolvePhotoUri owns native file:// vs web
blob). Override column (cover_photo_id) deferred until users ask.

## Profile facts available
session.user.email (useSession), live sync state (useStatus: connected/
uploading/downloading/errors), aggregate counts; sign-out currently on
SyncStatusBar → signOutAndClear (sync.ts:58). Profile absorbs it.

## Global scan — picker-first, not scan-first
scan.tsx needs the collection BEFORE lookup (vertical → templateFor →
adapter choice at scan.tsx:73-92; results route to that collection's
new-item). Scan-first would mean guessing the adapter — rework, skip.
Center button → lightweight collection-picker modal (useCollections) →
push existing `/collection/[id]/scan` unchanged; auto-skip picker when
exactly one collection exists.
