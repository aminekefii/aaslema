-- Moment likes (shared counts). Run after 007_moments.sql. Signed-in users like other people's
-- approved moments and manage only their own likes; nobody can see who liked what. Safe to re-run,
-- but re-running does not change an existing table: alter it by hand if it changes later.

create table if not exists public.moment_likes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, moment_id)
);

create index if not exists moment_likes_moment_idx on public.moment_likes (moment_id);

alter table public.moment_likes enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.moment_likes from anon, authenticated;
grant select, delete on public.moment_likes to authenticated;
grant insert (moment_id) on public.moment_likes to authenticated;

-- Approved and not the caller's own? Runs as the owner, because users can't read other
-- people's moments.
create or replace function public.moment_can_be_liked(p_moment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.moments m
    where m.id = p_moment_id and m.approved_at is not null and m.user_id <> auth.uid()
  )
$$;

revoke all on function public.moment_can_be_liked(uuid) from public;
grant execute on function public.moment_can_be_liked(uuid) to authenticated;

drop policy if exists "Users read their own moment likes" on public.moment_likes;
create policy "Users read their own moment likes" on public.moment_likes
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users like other people's approved moments" on public.moment_likes;
create policy "Users like other people's approved moments" on public.moment_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.moment_can_be_liked(moment_id));
drop policy if exists "Users remove their own moment likes" on public.moment_likes;
create policy "Users remove their own moment likes" on public.moment_likes
  for delete to authenticated using (user_id = auth.uid());

-- Approved moments of one destination, now with like counts, whether the caller liked each
-- one and whether it is the caller's own (both always false for visitors). The return type
-- changes, so drop the 007 version.
drop function if exists public.published_moments(text);
create function public.published_moments(p_city_id text)
returns table (id uuid, author_name text, spot text, caption text, image_path text, created_at timestamptz, likes bigint, liked boolean, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.author_name, m.spot, m.caption, m.image_path, m.created_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id),
    exists (select 1 from public.moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()),
    coalesce(m.user_id = auth.uid(), false)
  from public.moments m
  where m.city_id = p_city_id and m.approved_at is not null
  order by m.approved_at desc
  limit 50
$$;

revoke all on function public.published_moments(text) from public;
grant execute on function public.published_moments(text) to anon, authenticated;
