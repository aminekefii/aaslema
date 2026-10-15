-- Visit counts per city for everyone (the landing page's Most Visited section),
-- without revealing who visited what. Needs 004_city_likes_visits.sql. Safe to re-run.

create or replace function public.city_visit_counts()
returns table (city_id text, visits bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.city_id, count(*) from public.city_visits v group by v.city_id
$$;

revoke all on function public.city_visit_counts() from public;
grant execute on function public.city_visit_counts() to anon, authenticated;
