# Admin dashboard, part 1: foundation + Users — design

Date: 2026-10-15
Status: approved in brainstorming, awaiting spec review

## Goal

Give the site an admin area at `/admin`, reachable only by admin accounts,
with a read-only Users page. This is part 1 of the admin dashboard:

1. **Foundation + Users** (this spec)
2. Contact messages: store them in Supabase; admins read them and mark them handled
3. Community posts in Supabase + moderation (also feeds the user area's feed)
4. Content management: destinations, festivals, FAQs moved into the database

Each later part gets its own spec and plan.

## Decisions

| Question | Decision |
|---|---|
| Admin credentials | No hard-coded login. The existing account `aminekefi416@gmail.com` is marked admin in Supabase (not deleted and re-created) |
| Where the admin mark lives | `auth.users.raw_app_meta_data.role = 'admin'` (exposed as `user.app_metadata.role` and in the JWT); users cannot change app metadata themselves |
| Where data is protected | In the database: the users list comes from a function that refuses non-admins. Hiding `/admin` in the UI is convenience only |
| Admin after sign in | Lands on `/admin`; can still use `/app` via "View site" |
| Users page | View only: totals, search, table. No block/delete/promote actions yet |
| Look | Dark sidebar dashboard, light content area; top bar + menu on phones |

## Roles

`src/roles.js` (pure, unit-tested):

- `isAdmin(user)` — `user?.app_metadata?.role === 'admin'`
- `homeFor(user)` — `'/admin'` if `isAdmin(user)`, else `'/app'`

## URLs

| URL | Shows |
|---|---|
| `/admin` | Users page (`AdminUsers`) |
| any other `/admin/...` | redirect to `/admin` |

The sidebar shows only Users, "View site" (→ `/app`) and "Sign out".
Messages, Posts and Content are added when their parts are built — no
"coming soon" links.

## Redirect rules

`redirectFor(path, signedIn, isAdmin = false)` in `src/redirects.js` gains
these rules; every existing rule and test stays as it is for
`isAdmin = false`. New exported helper `isAdminPath(path)`:
`path === '/admin' || path.startsWith('/admin/')`. New exported list
`adminPagePaths = ['/admin']`.

Signed out:
- `/admin` or `/admin/...` → `/signin`

Signed in, not admin:
- `/admin` or `/admin/...` → `/app`

Signed in, admin:
- `''`, `/signin`, `/signup` → `/admin` (instead of `/app`)
- `/admin/...` not in `adminPagePaths` → `/admin`
- `/admin` → `null`
- `/app/...` → same rules as any signed-in user (allowed for "View site")
- public mirrored pages (`/destinations`, `/festivals`, `/community`,
  `/contact`, `/destinations/<city>`) → their `/app` twin, as for any user
- `/faq`, `/reset-password` → `null`

`withHash` keeps working unchanged: an `/admin` target never carries the
hash (it does not start with `/app/`).

`App.jsx` passes `isAdmin(user)` as the third argument.

## Sign in

`Auth.jsx` `signIn`: after success, `window.location.assign(homeFor(data.user))`.
Sign up is unchanged (`/app`); new accounts are never admins.

**Session refresh:** the admin mark is read from the session token. After
running `002_make_admin.sql`, the admin must sign out and sign in once, or
the old session keeps acting as a normal user until it refreshes.

## Database

SQL lives in `backend/supabase/`, numbered, run once each in order in the
Supabase SQL Editor. Running a file twice must be safe
(`create or replace`, idempotent update).

### `001_admin_users.sql`

```sql
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
```

Returns only those six fields — never password hashes, tokens or other
auth columns. Returns every user in one call; fine up to a few thousand
accounts, paging comes later if needed.

### `002_make_admin.sql`

```sql
-- Mark the site owner's account as admin. Sign out and back in afterwards.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'aminekefi416@gmail.com';

-- To remove admin rights again:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role'
-- where email = 'aminekefi416@gmail.com';
```

Merging with `||` keeps the account's other app metadata (e.g. `provider`).

## Frontend

### New

- `src/roles.js` — `isAdmin`, `homeFor` (above).
- `src/adminUsers.js` — pure helpers for the Users page:
  - `userStats(users, now = new Date())` →
    `{ total, newThisWeek, unconfirmed }`. `newThisWeek` counts users whose
    `created_at` is within the last 7 × 24 h before `now` (inclusive);
    `unconfirmed` counts `email_confirmed_at == null`.
  - `filterUsers(users, query)` — case-insensitive match of the trimmed
    query against `email` and `full_name` (null-safe); empty query returns
    all users.
- `src/sections/AdminLayout.jsx` — `AdminLayout({ user, onSignOut, children })`:
  - dark sidebar: logo + "Admin" label; nav with "Users" (→ `/admin`,
    active on `/admin`); bottom: "View site" (→ `/app`), "Sign out" button,
    the admin's name or email.
  - content area to the right on a light background, with the page inside.
  - below 992px: the sidebar becomes a top bar with logo and a menu toggle
    that opens the same links.
  - existing `Switcher` (language/theme) in the sidebar footer.
- `src/pages/admin/AdminUsers.jsx` — the Users page:
  - on mount: `supabase.rpc('admin_list_users')`; sets `document.title`
    to `Users - Aaslema Admin`.
  - three stat cards from `userStats`.
  - search box filtering with `filterUsers` as you type.
  - table: Name (or "—"), Email, Joined (date), Last sign-in (relative,
    e.g. "2h ago"; "Never" when null), Status badge (Confirmed /
    Unconfirmed).
  - states: loading ("Loading users…"); error code `42501` → "Your session
    doesn't have admin rights yet. Sign out and sign in again."; any other
    error → short message + "Try again" button (re-runs the call); no search
    matches → "No users match".

### Changed

- `src/redirects.js` (+ `redirects.test.js`) — admin rules above.
- `src/App.jsx`:
  - admin branch: for `isAdminPath(currentPath)`, render
    `<AdminLayout user onSignOut>` with the admin page inside — no public
    `Header`/`AppHeader`, no `Footer`.
  - `adminPages = { '/admin': AdminUsers }`.
  - passes `isAdmin(user)` to `redirectFor`; `ready` also stays false for
    an admin path without an admin user (same safety net as `/app`).
  - the existing `signOut` (with the `signingOut` flag) is shared by
    `AppHeader` and `AdminLayout`.
- `src/sections/AppHeader.jsx` — when `isAdmin(user)`, an extra "Admin" nav
  link to `/admin` (after AI Planner). Not rendered for normal users.
- `src/pages/Auth.jsx` — sign in goes to `homeFor(data.user)`.
- `src/styles.css` — `admin-` prefixed styles using the existing colour
  variables; works with the existing dark theme (`html.dark`).

### Not touched

Public pages, `/app` pages other than the header link, `supabase.js`,
nginx config.

## Testing

- **Vitest:**
  - `roles.test.js` — `isAdmin` for admin, normal user, null/undefined
    user, missing `app_metadata`; `homeFor` for both.
  - `redirects.test.js` — every new admin rule, signed out / normal user /
    admin, plus existing tests unchanged.
  - `adminUsers.test.js` — `userStats` (7-day boundary: exactly 7 days ago
    counts, 7 days + 1 ms does not; unconfirmed counting; empty list);
    `filterUsers` (case-insensitive, matches name or email, null names,
    whitespace-only query returns all).
- **SQL:** checked by reading (no database in the test setup); run once by
  the site owner.
- **Manual, in the browser** (after running both SQL files and signing in
  again):
  1. Admin sign in → lands on `/admin` with the sidebar.
  2. Totals and table show real accounts; search narrows by name and email.
  3. "View site" → `/app`; the user navbar shows "Admin"; it goes back.
  4. Normal user opens `/admin` → lands on `/app`; no "Admin" link.
  5. Signed out, open `/admin` → `/signin`.
  6. Phone width: sidebar becomes a top bar with a working menu.
  7. Sign out from the sidebar → `/`.
  8. In the Supabase SQL Editor, run `select * from public.admin_list_users();`
     → error "not allowed" (the editor has no signed-in admin session).
     Proves the database, not the UI, is what protects the list.

## Future work

- Parts 2–4 above.
- User actions: block/unblock, delete, promote/demote admin (each with
  self-protection checks).
- Paging for the users list.
