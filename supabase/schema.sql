-- ============================================================
-- TheCollector — Supabase schema (phase 2)
-- Mirrors the client PowerSync schema. Applied via psql.
-- Author(s): John Reed
-- ============================================================

-- Collections
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  vertical text not null,
  created_at text,
  updated_at text
);

-- Items — money in integer cents, custom_fields is vertical-owned JSON
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  name text not null,
  notes text,
  acquired_at text,
  purchase_price_cents bigint,
  current_value_cents bigint,
  custom_fields text,
  tags text, -- JSON array of lowercase tag strings (phase 6)
  source text, -- metadata source-link (phase 7): which lookup filled this item
  source_id text, -- the source's own id for the hit
  created_at text,
  updated_at text
);

create index if not exists items_collection_idx on public.items (collection_id);
create index if not exists collections_user_idx on public.collections (user_id);
create index if not exists items_user_idx on public.items (user_id);

-- Item value history (phase 7) — append-only trail, one row per value an
-- item has carried; the client writes rows from crud.ts on create/change.
create table if not exists public.item_value_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  value_cents bigint,
  recorded_at text,
  source text -- 'manual' or a metadata source id
);

create index if not exists item_value_history_item_idx on public.item_value_history (item_id);
create index if not exists item_value_history_user_idx on public.item_value_history (user_id);

-- Own-rows RLS + grants, same pattern as photos/security.sql
alter table public.item_value_history enable row level security;

drop policy if exists "own item_value_history" on public.item_value_history;
create policy "own item_value_history" on public.item_value_history
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.item_value_history to authenticated;
grant select on public.item_value_history to powersync_role;

-- Replication: add the history table to the powersync publication
alter publication powersync add table public.item_value_history;

-- ============================================================
-- Migration notes — statements to apply to an EXISTING cloud db.
-- Fresh databases get these from the create tables above.
-- ============================================================
-- P6-T1: item tags (JSON array of lowercase strings). Apply via psql:
--   alter table public.items add column if not exists tags text;
-- Publication is whole-table and sync streams use SELECT *, so no
-- replication/stream changes are needed for this column.
--
-- P7-T1: value history + metadata source-link. MAIN SESSION MUST APPLY
-- via psql on the existing cloud db:
--   alter table public.items add column if not exists source text;
--   alter table public.items add column if not exists source_id text;
--   -- plus the entire item_value_history block above (create table,
--   -- indexes, RLS policy, grants, and the alter publication line).
-- The items columns need no replication/stream changes (whole-table
-- publication + SELECT * streams). The NEW table does need its sync
-- stream deployed — see powersync/sync-streams.yaml (dashboard deploy).
