-- Public profile card: a short bio and a travel style on the profile, and the counts shown on the
-- card. For now only the owner sees the card (Edit profile); showing it to other users comes later
-- and will need its own read function (phone stays private). Run after 009_profiles.sql,
-- 004_city_likes_visits.sql, 007_moments.sql and 014_community_posts.sql. Safe to re-run.

alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists travel_style text;

alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check
  check (bio is null or (char_length(bio) <= 300 and btrim(bio, E' \t\r\n') <> ''));

alter table public.profiles drop constraint if exists profiles_travel_style_check;
alter table public.profiles add constraint profiles_travel_style_check
  check (travel_style is null or travel_style in ('backpacker', 'bikepacker', 'road-tripper', 'culture', 'beach'));

grant update (bio, travel_style) on public.profiles to authenticated;

-- The caller's card counts: destinations marked visited, approved moments, community posts
create or replace function public.my_profile_stats()
returns table (visited bigint, moments bigint, posts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.city_visits v where v.user_id = auth.uid()),
    (select count(*) from public.moments m where m.user_id = auth.uid() and m.approved_at is not null),
    (select count(*) from public.community_posts c where c.user_id = auth.uid())
$$;

revoke all on function public.my_profile_stats() from public, anon;
grant execute on function public.my_profile_stats() to authenticated;
