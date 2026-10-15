-- Admin dashboard, part 1. Run once in the Supabase SQL Editor; safe to re-run.

-- True when the caller's session carries app_metadata.role = 'admin'.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- All accounts for the admin Users page. Runs as the owner because normal
-- roles cannot read auth.users; refuses anyone who is not an admin.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
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
    select u.id, u.email::text, (u.raw_user_meta_data ->> 'full_name')::text,
           u.created_at, u.last_sign_in_at, u.email_confirmed_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
