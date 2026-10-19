-- Community posts and likes on /app/community. Posts show for every signed-in user as soon as
-- they are published (no approval); authors edit and delete only their own, anyone signed in
-- likes any post (own posts too). Run after 009_profiles.sql. Safe to re-run, but re-running
-- does not change an existing table: alter its constraints by hand if they change later.

-- Stop before creating anything if 009 hasn't been run
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run 009_profiles.sql before 014_community_posts.sql';
  end if;
end $$;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Name at publish time, shown only if the author's profile row is missing
  author_name text not null check (char_length(author_name) <= 100 and btrim(author_name, E' \t\r\n') <> ''),
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (char_length(btrim(title, E' \t\r\n')) between 3 and 120),
  body text not null check (char_length(btrim(body, E' \t\r\n')) between 20 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx on public.community_posts (created_at desc);

alter table public.community_posts enable row level security;

-- Authors publish (user_id comes from the default), edit the content columns and delete their own
-- posts; everyone else reads posts through community_feed() below.
revoke all on public.community_posts from anon, authenticated;
grant select, delete on public.community_posts to authenticated;
grant insert (author_name, city_id, title, body) on public.community_posts to authenticated;
grant update (city_id, title, body) on public.community_posts to authenticated;

drop policy if exists "Users read their own posts" on public.community_posts;
create policy "Users read their own posts" on public.community_posts
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users publish their own posts" on public.community_posts;
create policy "Users publish their own posts" on public.community_posts
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users edit their own posts" on public.community_posts;
create policy "Users edit their own posts" on public.community_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete their own posts" on public.community_posts;
create policy "Users delete their own posts" on public.community_posts
  for delete to authenticated using (user_id = auth.uid());

-- Post likes (shared counts); nobody can see who liked what.
create table if not exists public.community_post_likes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id uuid not null references public.community_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists community_post_likes_post_idx on public.community_post_likes (post_id);

alter table public.community_post_likes enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.community_post_likes from anon, authenticated;
grant select, delete on public.community_post_likes to authenticated;
grant insert (post_id) on public.community_post_likes to authenticated;

drop policy if exists "Users read their own post likes" on public.community_post_likes;
create policy "Users read their own post likes" on public.community_post_likes
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users like posts" on public.community_post_likes;
create policy "Users like posts" on public.community_post_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove their own post likes" on public.community_post_likes;
create policy "Users remove their own post likes" on public.community_post_likes
  for delete to authenticated using (user_id = auth.uid());

-- Newest posts with the author's current name and photo, like counts, whether the caller liked
-- each one and whether it is the caller's own; without user ids (the photo path has one, as in 010).
drop function if exists public.community_feed();
create function public.community_feed()
returns table (id uuid, author_name text, author_avatar text, city_id text, title text, body text, created_at timestamptz, likes bigint, liked boolean, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, coalesce(p.full_name, c.author_name), p.avatar_path, c.city_id, c.title, c.body, c.created_at,
    (select count(*) from public.community_post_likes l where l.post_id = c.id),
    exists (select 1 from public.community_post_likes l where l.post_id = c.id and l.user_id = auth.uid()),
    c.user_id = auth.uid()
  from public.community_posts c
  left join public.profiles p on p.id = c.user_id
  order by c.created_at desc
  limit 100
$$;

revoke all on function public.community_feed() from public;
grant execute on function public.community_feed() to authenticated;
