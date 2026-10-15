-- Trip reviews: one per signed-in user, published after an admin approves it.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run, but re-running
-- does not change an existing table: alter its constraints by hand if they change later.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) <= 100 and btrim(author_name, E' \t\r\n') <> ''),
  travel_style text not null check (
    travel_style in ('Backpacker', 'Bikepacker', 'History Traveler', 'Solo Traveler', 'Other')
  ),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body, E' \t\r\n')) between 10 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists reviews_approved_at_idx on public.reviews (approved_at desc);

alter table public.reviews enable row level security;

-- Column-level grants: authors fill the content columns only; approved_at is
-- updatable, but the trigger below lets only admins change it.
revoke all on public.reviews from anon, authenticated;
grant select, delete on public.reviews to authenticated;
grant insert (author_name, travel_style, rating, body) on public.reviews to authenticated;
grant update (author_name, travel_style, rating, body, approved_at) on public.reviews to authenticated;

drop policy if exists "Users read their own review, admins all" on public.reviews;
create policy "Users read their own review, admins all" on public.reviews
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users add their own review" on public.reviews;
create policy "Users add their own review" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and approved_at is null);

drop policy if exists "Users edit their own review, admins all" on public.reviews;
create policy "Users edit their own review, admins all" on public.reviews
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins delete reviews" on public.reviews;
create policy "Admins delete reviews" on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- A content change always goes back to pending; only admins approve or unpublish.
create or replace function public.reviews_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.author_name, new.travel_style, new.rating, new.body)
     is distinct from (old.author_name, old.travel_style, old.rating, old.body) then
    new.approved_at := null;
    new.updated_at := now();
  elsif new.approved_at is distinct from old.approved_at and not public.is_admin() then
    raise exception 'only admins can approve reviews' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_before_update on public.reviews;
create trigger reviews_before_update
  before update on public.reviews
  for each row execute function public.reviews_before_update();

-- Approved reviews for the landing page, newest first, without user ids.
create or replace function public.published_reviews()
returns table (id uuid, author_name text, travel_style text, rating smallint, body text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.author_name, r.travel_style, r.rating, r.body
  from public.reviews r
  where r.approved_at is not null
  order by r.approved_at desc
  limit 20
$$;

revoke all on function public.published_reviews() from public;
grant execute on function public.published_reviews() to anon, authenticated;
