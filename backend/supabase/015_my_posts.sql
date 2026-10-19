-- My posts: a user's own community posts with like counts, for the profile dashboard.
-- Run after 014_community_posts.sql. Safe to re-run.

-- The caller's posts, newest first, all of them (the community feed stops at the newest 100 from everyone).
-- Runs as the owner so likes from everyone are counted.
create or replace function public.my_posts()
returns table (id uuid, city_id text, title text, body text, created_at timestamptz, likes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.city_id, c.title, c.body, c.created_at,
    (select count(*) from public.community_post_likes l where l.post_id = c.id)
  from public.community_posts c
  where c.user_id = auth.uid()
  order by c.created_at desc
$$;

revoke all on function public.my_posts() from public, anon;
grant execute on function public.my_posts() to authenticated;
