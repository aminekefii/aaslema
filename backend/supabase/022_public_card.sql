-- Public profile card for signed-in users: clicking an author on a post, moment or comment shows
-- their card. The lists never send user ids, so the card is found from the item instead:
-- public_card('post' | 'moment' | 'comment', item id). Only public fields come back: no phone,
-- email or ids. Run after 021_profile_card.sql and 019_post_comments.sql. Safe to re-run.

create or replace function public.public_card(p_kind text, p_id uuid)
returns table (full_name text, avatar_path text, city text, country text, bio text, travel_style text, visited bigint, moments bigint, posts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with author as (
    select case p_kind
      when 'post' then (select c.user_id from public.community_posts c where c.id = p_id)
      -- Only approved moments are listed anywhere, so only their authors can be looked up
      when 'moment' then (select m.user_id from public.moments m where m.id = p_id and m.approved_at is not null)
      when 'comment' then (select k.user_id from public.community_post_comments k where k.id = p_id)
    end as id
  )
  select p.full_name, p.avatar_path, p.city, p.country, p.bio, p.travel_style,
    (select count(*) from public.city_visits v where v.user_id = p.id),
    (select count(*) from public.moments m where m.user_id = p.id and m.approved_at is not null),
    (select count(*) from public.community_posts c where c.user_id = p.id)
  from author a
  join public.profiles p on p.id = a.id
$$;

revoke all on function public.public_card(text, uuid) from public, anon;
grant execute on function public.public_card(text, uuid) to authenticated;
