-- Posting limits: stop one person (or a bot) flooding the site with contact messages, posts,
-- comments, reports or moments. Too many in the last hour → the insert fails with error code
-- P0429, which the site shows as "You're doing that too often". Likes, reviews and plans
-- already allow only one row per person per item, so they need no limit.
-- Run after 003, 007, 014, 016 and 019. Safe to re-run; change a limit by editing the trigger
-- arguments below and running the file again.

-- Signed-in inserts: at most TG_ARGV[0] rows by the same user in the last hour.
-- Runs as the owner so it counts rows the user can't read (e.g. their own reports).
create or replace function public.enforce_hourly_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent int;
begin
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 hour''', tg_table_name)
    into recent using new.user_id;
  if recent >= tg_argv[0]::int then
    raise exception 'too many in the last hour' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_hourly_limit() from public, anon, authenticated;

drop trigger if exists hourly_limit on public.community_posts;
create trigger hourly_limit before insert on public.community_posts
  for each row execute function public.enforce_hourly_limit('10');

drop trigger if exists hourly_limit on public.community_post_comments;
create trigger hourly_limit before insert on public.community_post_comments
  for each row execute function public.enforce_hourly_limit('30');

drop trigger if exists hourly_limit on public.post_reports;
create trigger hourly_limit before insert on public.post_reports
  for each row execute function public.enforce_hourly_limit('20');

drop trigger if exists hourly_limit on public.moments;
create trigger hourly_limit before insert on public.moments
  for each row execute function public.enforce_hourly_limit('10');

-- Contact form (visitors too): at most 5 messages per email address, and 100 from everyone,
-- in the last hour. The overall cap stops a bot that changes the email every time.
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at);

create or replace function public.enforce_contact_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.contact_messages m
      where lower(m.email) = lower(new.email) and m.created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.contact_messages m where m.created_at > now() - interval '1 hour') >= 100
  then
    raise exception 'too many messages in the last hour' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_contact_limit() from public, anon, authenticated;

drop trigger if exists contact_limit on public.contact_messages;
create trigger contact_limit before insert on public.contact_messages
  for each row execute function public.enforce_contact_limit();
