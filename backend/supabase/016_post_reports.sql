-- Post reports: signed-in users report other people's community posts; only admins read them
-- (admin Post reports page, read only for now). Run after 001_admin_users.sql, 009_profiles.sql
-- and 014_community_posts.sql. Safe to re-run, but re-running does not change an existing table.

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- A deleted post takes its reports with it: there would be nothing left to look at
  post_id uuid not null references public.community_posts (id) on delete cascade,
  reason text not null check (char_length(btrim(reason, E' \t\r\n')) between 10 and 1000),
  created_at timestamptz not null default now(),
  -- One report per person per post
  unique (user_id, post_id)
);

create index if not exists post_reports_created_idx on public.post_reports (created_at desc);

alter table public.post_reports enable row level security;

-- Users add reports (user_id comes from the default); admins read them. Nobody edits or deletes them yet.
revoke all on public.post_reports from anon, authenticated;
grant select on public.post_reports to authenticated;
grant insert (post_id, reason) on public.post_reports to authenticated;

-- Someone else's post? Runs as the owner, because users can't read other people's posts.
create or replace function public.post_can_be_reported(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_posts c
    where c.id = p_post_id and c.user_id <> auth.uid()
  )
$$;

revoke all on function public.post_can_be_reported(uuid) from public, anon;
grant execute on function public.post_can_be_reported(uuid) to authenticated;

drop policy if exists "Users report other people's posts" on public.post_reports;
create policy "Users report other people's posts" on public.post_reports
  for insert to authenticated
  with check (user_id = auth.uid() and public.post_can_be_reported(post_id));
drop policy if exists "Admins read post reports" on public.post_reports;
create policy "Admins read post reports" on public.post_reports
  for select to authenticated using (public.is_admin());

-- Reports for the admin page, newest first, with the reporter's current name and the post's title.
-- Runs as the owner because admins can't read profiles' names through posts; refuses anyone else.
create or replace function public.admin_post_reports()
returns table (id uuid, reporter_name text, reason text, created_at timestamptz, post_id uuid, post_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
    select r.id, coalesce(p.full_name, 'Unknown user'), r.reason, r.created_at, r.post_id, c.title
    from public.post_reports r
    join public.community_posts c on c.id = r.post_id
    left join public.profiles p on p.id = r.user_id
    order by r.created_at desc;
end;
$$;

revoke all on function public.admin_post_reports() from public, anon;
grant execute on function public.admin_post_reports() to authenticated;
