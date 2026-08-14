-- ============================================================
-- TheCollector — lookup_cache table (phase 5.5)
-- The upc_cache pattern grown up: (source, normalized query)
-- → raw upstream payload, stored once, forever. Written only
-- by the metadata function's service role; no client policies
-- on purpose — RLS on with zero policies means authenticated
-- users cannot touch it directly, same stance as upc_cache.
-- Author(s): John Reed
-- ============================================================

create table if not exists public.lookup_cache (
  source text not null,
  query text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (source, query)
);

alter table public.lookup_cache enable row level security;
