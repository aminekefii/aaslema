-- Feed moments: the newest approved moments from every destination, for the Feed at /app.
-- Run after 007_moments.sql and 009_profiles.sql. Safe to re-run.

-- Like published_moments (010) but across destinations, without likes; no user ids (the photo path has one, see 010).
create or replace function public.feed_moments()
returns table (id uuid, author_name text, author_avatar text, city_id text, spot text, caption text, image_path text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, coalesce(p.full_name, m.author_name), p.avatar_path, m.city_id, m.spot, m.caption, m.image_path, m.created_at
  from public.moments m
  left join public.profiles p on p.id = m.user_id
  where m.approved_at is not null
  order by m.approved_at desc
  limit 12
$$;

revoke all on function public.feed_moments() from public, anon;
grant execute on function public.feed_moments() to authenticated;
