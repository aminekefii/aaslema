-- Festivals in each user's plan. Signed-in users manage only their own rows.
-- Safe to re-run, but re-running does not change an existing table.

create table if not exists public.festival_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  festival_id text not null check (festival_id ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

alter table public.festival_plans enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.festival_plans from anon, authenticated;
grant select, delete on public.festival_plans to authenticated;
grant insert (festival_id) on public.festival_plans to authenticated;

drop policy if exists "Users read their own festival plan" on public.festival_plans;
create policy "Users read their own festival plan" on public.festival_plans
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users add to their own festival plan" on public.festival_plans;
create policy "Users add to their own festival plan" on public.festival_plans
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users remove from their own festival plan" on public.festival_plans;
create policy "Users remove from their own festival plan" on public.festival_plans
  for delete to authenticated using (user_id = auth.uid());
