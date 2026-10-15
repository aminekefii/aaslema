-- Destination likes (shared counts) and visits (personal). Signed-in users manage
-- only their own rows. Safe to re-run, but re-running does not change existing
-- tables: alter their constraints by hand if they change later.

create table if not exists public.city_likes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create table if not exists public.city_visits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

alter table public.city_likes enable row level security;
alter table public.city_visits enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.city_likes, public.city_visits from anon, authenticated;
grant select, delete on public.city_likes, public.city_visits to authenticated;
grant insert (city_id) on public.city_likes, public.city_visits to authenticated;

drop policy if exists "Users read their own likes" on public.city_likes;
create policy "Users read their own likes" on public.city_likes
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users add their own likes" on public.city_likes;
create policy "Users add their own likes" on public.city_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove their own likes" on public.city_likes;
create policy "Users remove their own likes" on public.city_likes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Users read their own visits" on public.city_visits;
create policy "Users read their own visits" on public.city_visits
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users add their own visits" on public.city_visits;
create policy "Users add their own visits" on public.city_visits
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove their own visits" on public.city_visits;
create policy "Users remove their own visits" on public.city_visits
  for delete to authenticated using (user_id = auth.uid());

-- Like counts per city for everyone, without revealing who liked what.
create or replace function public.city_like_counts()
returns table (city_id text, likes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.city_id, count(*) from public.city_likes l group by l.city_id
$$;

revoke all on function public.city_like_counts() from public;
grant execute on function public.city_like_counts() to anon, authenticated;
