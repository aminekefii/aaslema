-- Contact form messages. Anyone can send; only admins can read or mark them.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (
    char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  subject text check (subject is null or char_length(subject) <= 150),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  user_id uuid references auth.users (id) on delete set null,
  handled_at timestamptz
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Column-level grants: senders can only fill these columns; admins can only change handled_at.
revoke all on public.contact_messages from anon, authenticated;
grant insert (name, email, subject, message, user_id) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (handled_at) on public.contact_messages to authenticated;

drop policy if exists "Anyone can send a message" on public.contact_messages;
create policy "Anyone can send a message" on public.contact_messages
  for insert to anon, authenticated
  with check (handled_at is null and (user_id is null or user_id = auth.uid()));

drop policy if exists "Admins can read messages" on public.contact_messages;
create policy "Admins can read messages" on public.contact_messages
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can mark messages" on public.contact_messages;
create policy "Admins can mark messages" on public.contact_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
