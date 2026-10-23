-- Comments on community posts. Everyone (visitors too, as with the feed in 018) reads them;
-- signed-in users comment on any post and delete their own comments. No editing.
-- Run after 018_public_community_feed.sql. Safe to re-run, but re-running does not change an
-- existing table: alter its constraints by hand if they change later.

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id uuid not null references public.community_posts (id) on delete cascade,
  -- Name at comment time, shown only if the author's profile row is missing
  author_name text not null check (char_length(author_name) <= 100 and btrim(author_name, E' \t\r\n') <> ''),
  body text not null check (char_length(btrim(body, E' \t\r\n')) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists community_post_comments_post_idx on public.community_post_comments (post_id, created_at);

alter table public.community_post_comments enable row level security;

-- Users add comments (user_id comes from the default) and delete their own; everyone reads
-- them through post_comments() below.
revoke all on public.community_post_comments from anon, authenticated;
grant select, delete on public.community_post_comments to authenticated;
grant insert (post_id, author_name, body) on public.community_post_comments to authenticated;

drop policy if exists "Users read their own comments" on public.community_post_comments;
create policy "Users read their own comments" on public.community_post_comments
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users comment on posts" on public.community_post_comments;
create policy "Users comment on posts" on public.community_post_comments
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users delete their own comments" on public.community_post_comments;
create policy "Users delete their own comments" on public.community_post_comments
  for delete to authenticated using (user_id = auth.uid());

-- One post's comments, oldest first, with the author's current name and photo and whether each
-- is the caller's own; without user ids (the photo path has one, as in 010).
create or replace function public.post_comments(p_post_id uuid)
returns table (id uuid, author_name text, author_avatar text, body text, created_at timestamptz, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, coalesce(p.full_name, c.author_name), p.avatar_path, c.body, c.created_at,
    coalesce(c.user_id = auth.uid(), false)
  from public.community_post_comments c
  left join public.profiles p on p.id = c.user_id
  where c.post_id = p_post_id
  order by c.created_at
  limit 200
$$;

revoke all on function public.post_comments(uuid) from public;
grant execute on function public.post_comments(uuid) to anon, authenticated;

-- community_feed() from 014 with a comment count added at the end (a new column means drop and
-- create, so the grants from 014 and 018 are given again).
drop function if exists public.community_feed();
create function public.community_feed()
returns table (id uuid, author_name text, author_avatar text, city_id text, title text, body text, created_at timestamptz, likes bigint, liked boolean, mine boolean, comments bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, coalesce(p.full_name, c.author_name), p.avatar_path, c.city_id, c.title, c.body, c.created_at,
    (select count(*) from public.community_post_likes l where l.post_id = c.id),
    exists (select 1 from public.community_post_likes l where l.post_id = c.id and l.user_id = auth.uid()),
    coalesce(c.user_id = auth.uid(), false),
    (select count(*) from public.community_post_comments m where m.post_id = c.id)
  from public.community_posts c
  left join public.profiles p on p.id = c.user_id
  order by c.created_at desc
  limit 100
$$;

revoke all on function public.community_feed() from public;
grant execute on function public.community_feed() to anon, authenticated;
