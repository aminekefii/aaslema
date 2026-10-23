-- Moment likes on the Feed at /app: feed_moments() from 017 with like counts, whether the caller
-- liked each moment and whether it is the caller's own (people can't like their own, see 008).
-- Run after 017_feed_moments.sql and 008_moment_likes.sql. Safe to re-run.

-- New columns mean drop and create, so the grant from 017 is given again.
drop function if exists public.feed_moments();
create function public.feed_moments()
returns table (id uuid, author_name text, author_avatar text, city_id text, spot text, caption text, image_path text, created_at timestamptz, likes bigint, liked boolean, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, coalesce(p.full_name, m.author_name), p.avatar_path, m.city_id, m.spot, m.caption, m.image_path, m.created_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id),
    exists (select 1 from public.moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()),
    coalesce(m.user_id = auth.uid(), false)
  from public.moments m
  left join public.profiles p on p.id = m.user_id
  where m.approved_at is not null
  order by m.approved_at desc
  limit 12
$$;

revoke all on function public.feed_moments() from public, anon;
grant execute on function public.feed_moments() to authenticated;
