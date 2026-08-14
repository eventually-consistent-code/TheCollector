-- ============================================================
-- TheCollector — upc_cache table (phase 5)
-- Global UPC → product-title cache behind the metadata edge
-- function. Written only by the function's service role; no
-- client policies on purpose — RLS on with zero policies means
-- authenticated users cannot touch it directly.
-- Author(s): John Reed
-- ============================================================

create table if not exists public.upc_cache (
  upc text primary key,
  title text not null,
  brand text,
  source text not null default 'upcitemdb',
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.upc_cache enable row level security;
