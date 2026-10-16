-- Destination plans: each user's personal list of places to visit. Signed-in users manage
-- only their own rows. Safe to re-run, but re-running does not change an existing table.

create table if not exists public.city_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

alter table public.city_plans enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.city_plans from anon, authenticated;
grant select, delete on public.city_plans to authenticated;
grant insert (city_id) on public.city_plans to authenticated;

drop policy if exists "Users read their own plan" on public.city_plans;
create policy "Users read their own plan" on public.city_plans
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users add to their own plan" on public.city_plans;
create policy "Users add to their own plan" on public.city_plans
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users remove from their own plan" on public.city_plans;
create policy "Users remove from their own plan" on public.city_plans
  for delete to authenticated using (user_id = auth.uid());
