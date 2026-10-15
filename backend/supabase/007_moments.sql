-- Destination moments: photos users upload, shown after an admin approves them.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run, but re-running
-- does not change an existing table: alter its constraints by hand if they change later.

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  spot text check (spot is null or (char_length(spot) <= 100 and btrim(spot, E' \t\r\n') <> '')),
  caption text not null check (char_length(btrim(caption, E' \t\r\n')) between 3 and 300),
  author_name text not null check (char_length(author_name) <= 100 and btrim(author_name, E' \t\r\n') <> ''),
  image_path text not null unique check (image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists moments_city_approved_idx on public.moments (city_id, approved_at desc);

alter table public.moments enable row level security;

-- Uploaders fill the content columns once; only admins change approved_at.
revoke all on public.moments from anon, authenticated;
grant select, delete on public.moments to authenticated;
grant insert (city_id, spot, caption, author_name, image_path) on public.moments to authenticated;
grant update (approved_at) on public.moments to authenticated;

drop policy if exists "Users read their own moments, admins all" on public.moments;
create policy "Users read their own moments, admins all" on public.moments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- The photo must be in the uploader's own folder
drop policy if exists "Users add their own moments" on public.moments;
create policy "Users add their own moments" on public.moments
  for insert to authenticated
  with check (
    user_id = auth.uid() and approved_at is null
    and split_part(image_path, '/', 1) = auth.uid()::text
  );

drop policy if exists "Admins approve moments" on public.moments;
create policy "Admins approve moments" on public.moments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete moments" on public.moments;
create policy "Admins delete moments" on public.moments
  for delete to authenticated
  using (public.is_admin());

-- Helpers for the storage rules below. They run as the owner so the rules can
-- look at moments the caller is not allowed to read.
create or replace function public.moment_photo_is_published(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moments m where m.image_path = path and m.approved_at is not null)
$$;

create or replace function public.moment_photo_is_used(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moments m where m.image_path = path)
$$;

revoke all on function public.moment_photo_is_published(text) from public;
revoke all on function public.moment_photo_is_used(text) from public;
grant execute on function public.moment_photo_is_published(text) to anon, authenticated;
grant execute on function public.moment_photo_is_used(text) to authenticated;

-- Approved moments of one destination, newest approval first, without user ids.
create or replace function public.published_moments(p_city_id text)
returns table (id uuid, author_name text, spot text, caption text, image_path text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.author_name, m.spot, m.caption, m.image_path, m.created_at
  from public.moments m
  where m.city_id = p_city_id and m.approved_at is not null
  order by m.approved_at desc
  limit 50
$$;

revoke all on function public.published_moments(text) from public;
grant execute on function public.published_moments(text) to anon, authenticated;

-- Private bucket: JPEG only, 2 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload moment photos to their folder" on storage.objects;
create policy "Users upload moment photos to their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Moment photos: uploader, admins, or published" on storage.objects;
create policy "Moment photos: uploader, admins, or published" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'moments' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.moment_photo_is_published(name)
    )
  );

-- Admins remove any photo; uploaders only a photo no moment uses (cleanup after a failed save)
drop policy if exists "Moment photos: admins, or uploader before saving" on storage.objects;
create policy "Moment photos: admins, or uploader before saving" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'moments' and (
      public.is_admin()
      or ((storage.foldername(name))[1] = auth.uid()::text and not public.moment_photo_is_used(name))
    )
  );
