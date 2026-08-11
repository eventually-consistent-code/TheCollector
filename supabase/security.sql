-- ============================================================
-- TheCollector — RLS + grants (phase 2)
-- Uploads run as `authenticated` through the Data API: both the
-- grant AND the policy must pass (missing grant = 42501 first).
-- Downloads NEVER touch RLS — replication as powersync_role with
-- bypassrls; Sync Streams are the read-side filter.
-- Author(s): John Reed
-- ============================================================

alter table public.collections enable row level security;
alter table public.items enable row level security;

drop policy if exists "own collections" on public.collections;
create policy "own collections" on public.collections
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Explicit grants — required under the new Data API defaults
-- (enforced everywhere Oct 2026).
grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, update, delete on public.items to authenticated;
