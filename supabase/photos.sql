-- ============================================================
-- TheCollector — photos table + storage bucket (phase 4)
-- Object name is always {photo.id}.jpg at bucket root; storage
-- access is owner-based (uploader uid), not path-prefix.
-- Author(s): John Reed
-- ============================================================

-- Photos metadata (binaries live in storage, not postgres)
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  media_type text,
  created_at text
);

create index if not exists photos_item_idx on public.photos (item_id);
create index if not exists photos_user_idx on public.photos (user_id);

alter table public.photos enable row level security;

drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.photos to authenticated;
grant select on public.photos to powersync_role;

-- Replication: add photos to the powersync publication
alter publication powersync add table public.photos;

-- Storage: private photos bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Owner-based storage policies (Supabase stamps owner_id with uploader uid)
drop policy if exists "photos upload" on storage.objects;
create policy "photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "photos read own" on storage.objects;
create policy "photos read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and owner_id = auth.uid()::text);

drop policy if exists "photos delete own" on storage.objects;
create policy "photos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and owner_id = auth.uid()::text);
