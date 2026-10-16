-- Author name and photo on published reviews and moments, read live from public.profiles.
-- Run after 006_reviews.sql, 007_moments.sql, 008_moment_likes.sql and 009_profiles.sql. Safe to re-run.

-- Approved reviews for the landing page, newest first, without user ids.
drop function if exists public.published_reviews();
create function public.published_reviews()
returns table (id uuid, author_name text, author_avatar text, travel_style text, rating smallint, body text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, coalesce(p.full_name, r.author_name), p.avatar_path, r.travel_style, r.rating, r.body
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.approved_at is not null
  order by r.approved_at desc
  limit 20
$$;

revoke all on function public.published_reviews() from public;
grant execute on function public.published_reviews() to anon, authenticated;

-- Approved moments of a destination with like counts, newest first, without user ids.
drop function if exists public.published_moments(text);
create function public.published_moments(p_city_id text)
returns table (id uuid, author_name text, author_avatar text, spot text, caption text, image_path text, created_at timestamptz, likes bigint, liked boolean, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, coalesce(p.full_name, m.author_name), p.avatar_path, m.spot, m.caption, m.image_path, m.created_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id),
    exists (select 1 from public.moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()),
    coalesce(m.user_id = auth.uid(), false)
  from public.moments m
  left join public.profiles p on p.id = m.user_id
  where m.city_id = p_city_id and m.approved_at is not null
  order by m.approved_at desc
  limit 50
$$;

revoke all on function public.published_moments(text) from public;
grant execute on function public.published_moments(text) to anon, authenticated;
