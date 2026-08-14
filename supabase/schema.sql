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
  created_at text,
  updated_at text
);

create index if not exists items_collection_idx on public.items (collection_id);
create index if not exists collections_user_idx on public.collections (user_id);
create index if not exists items_user_idx on public.items (user_id);

-- ============================================================
-- Migration notes — statements to apply to an EXISTING cloud db.
-- Fresh databases get these from the create tables above.
-- ============================================================
-- P6-T1: item tags (JSON array of lowercase strings). Apply via psql:
--   alter table public.items add column if not exists tags text;
-- Publication is whole-table and sync streams use SELECT *, so no
-- replication/stream changes are needed for this column.
