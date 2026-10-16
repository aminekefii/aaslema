-- User profiles: name, phone, city, country, photo. Email and password stay in Supabase Auth.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run, but re-running
-- does not change an existing table: alter its constraints by hand if they change later.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) <= 80 and btrim(full_name, E' \t\r\n') <> ''),
  phone text check (phone is null or (phone ~ '^\+?[0-9 ()-]{6,20}$' and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 6)),
  city text check (city is null or (char_length(city) <= 60 and btrim(city, E' \t\r\n') <> '')),
  country text check (country is null or (char_length(country) <= 60 and btrim(country, E' \t\r\n') <> '')),
  avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  updated_at timestamptz not null default now(),
  -- A user's photo must be in their own folder
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text)
);

alter table public.profiles enable row level security;

-- Rows are created by the trigger below; users only edit their own fields.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, city, country, avatar_path) on public.profiles to authenticated;

drop policy if exists "Users read their own profile, admins all" on public.profiles;
create policy "Users read their own profile, admins all" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Name for a new row: the sign-up name, else the part of the email before the @
create or replace function public.profile_name(meta jsonb, email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(coalesce(nullif(btrim(meta->>'full_name', E' \t\r\n'), ''), nullif(split_part(email, '@', 1), ''), 'Traveller'), 80)
$$;

-- New account → new profile row
create or replace function public.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, public.profile_name(new.raw_user_meta_data, new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile();

-- Existing accounts get a row once
insert into public.profiles (id, full_name)
select u.id, public.profile_name(u.raw_user_meta_data, u.email)
from auth.users u
on conflict (id) do nothing;

-- Keep updated_at fresh
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Copy name and photo into the account, so the navbar, admin Users, reviews and moments see them
create or replace function public.profiles_sync_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('full_name', new.full_name, 'avatar_path', new.avatar_path)
  where id = new.id;
  return null;
end;
$$;

drop trigger if exists profiles_sync_metadata on public.profiles;
create trigger profiles_sync_metadata
  after update of full_name, avatar_path on public.profiles
  for each row execute function public.profiles_sync_metadata();

-- Public bucket: JPEG only, 1 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload avatars to their folder" on storage.objects;
create policy "Users upload avatars to their folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );

-- Deleting needs select too; files in a public bucket are readable by link anyway
drop policy if exists "Users see their own avatar files" on storage.objects;
create policy "Users see their own avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own avatars" on storage.objects;
create policy "Users delete their own avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
