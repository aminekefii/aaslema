# Admin Dashboard Part 1 (Foundation + Users) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An `/admin` area, reachable only by accounts marked admin in Supabase, with a read-only Users page (totals, search, table).

**Architecture:** The admin mark is `app_metadata.role = 'admin'` on the Supabase user. A `security definer` Postgres function `admin_list_users()` returns accounts only to admins. The frontend extends the tested `redirectFor` rules with an `isAdmin` argument, adds an `AdminLayout` sidebar and an `AdminUsers` page to the existing path switch in `App.jsx`, and keeps page logic in pure, tested helpers.

**Tech Stack:** React 18, Vite 5, Supabase JS v2 (`auth`, `rpc`), Postgres (Supabase), lucide-react, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-10-15-admin-users-design.md`

## Global Constraints

- Frontend commands run from `frontend/`; SQL lives in `backend/supabase/`.
- No hard-coded credentials anywhere. No Supabase secret/service key in the frontend.
- Admin check: `user?.app_metadata?.role === 'admin'`.
- `redirectFor(path, signedIn, isAdmin = false)`: every existing rule and test stays unchanged for `isAdmin = false`.
- Users page is view-only: no block/delete/promote actions.
- Sidebar shows only Users, View site (→ `/app`), Sign out — no "coming soon" links.
- `admin_list_users()` returns exactly `id, email, full_name, created_at, last_sign_in_at, email_confirmed_at`; refuses non-admins with errcode `42501`; not executable by `anon`.
- SQL files must be safe to run twice.
- New CSS classes prefixed `admin-`; use existing colour variables so `html.dark` works.
- Match surrounding code: no semicolons, single quotes, 2-space indent, short `//` comments only where the why isn't obvious.
- Never stage `docs/superpowers/specs/2026-10-15-user-app-area-design.md` (the user's own pending edit).

## Review Focus

1. **Old session after running the SQL** — the admin's existing session has no mark: they should land on `/app` (not crash) until they sign out and in. Pinned by Task 2 tests (admin=false on `/admin` → `/app`) and manual check 1.
2. **RPC failure** (network error, `42501`) — the Users page must show a message (and a Try again button for non-42501), never a blank page or crash. Pinned by Task 4's error branches (try/catch around the call) and manual check 8.
3. **Users with missing fields** — null `full_name`, null `last_sign_in_at`, null `email_confirmed_at` must render `—`, `Never`, `Unconfirmed`. Pinned by Task 3 tests (`lastSeen(null)`, `filterUsers` with null names, `userStats` unconfirmed).
4. **Path prefix collisions** — `/administrator` or `/admins` must not count as the admin area. Pinned by Task 2 tests.
5. **Sign out from the user navbar while admin** — must end on `/`, same as from the sidebar. Pinned by manual check 7 (shared `signOut` in `App.jsx`, Task 5).

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/supabase/001_admin_users.sql` (new) | `is_admin()`, `admin_list_users()` + grants |
| `backend/supabase/002_make_admin.sql` (new) | marks the owner's account admin |
| `frontend/src/roles.js` (new) + `roles.test.js` | `isAdmin`, `homeFor` |
| `frontend/src/redirects.js` + `redirects.test.js` | admin redirect rules, `isAdminPath`, `adminPagePaths` |
| `frontend/src/adminUsers.js` (new) + `adminUsers.test.js` | `userStats`, `filterUsers`, `lastSeen` |
| `frontend/src/data.js` | `adminNavLinks` |
| `frontend/src/sections/AdminLayout.jsx` (new) | sidebar layout |
| `frontend/src/pages/admin/AdminUsers.jsx` (new) | Users page |
| `frontend/src/styles.css` | `admin-` styles |
| `frontend/src/App.jsx` | admin branch, `isAdmin` to `redirectFor` |
| `frontend/src/sections/AppHeader.jsx` | "Admin" link for admins |
| `frontend/src/pages/Auth.jsx` | sign in → `homeFor(user)` |

---

### Task 1: SQL for the admin users list and admin mark

**Files:**
- Create: `backend/supabase/001_admin_users.sql`
- Create: `backend/supabase/002_make_admin.sql`

**Interfaces:**
- Produces: Postgres `public.is_admin() returns boolean`; `public.admin_list_users() returns table (id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz)`, called from the frontend as `supabase.rpc('admin_list_users')`; non-admin callers get an error with `code === '42501'`.

There is no database in the test setup: verification is careful reading against the spec. The site owner runs the files.

- [ ] **Step 1: Create `backend/supabase/001_admin_users.sql`**

```sql
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
```

- [ ] **Step 2: Create `backend/supabase/002_make_admin.sql`**

```sql
-- Mark the site owner's account as admin. Run after 001; safe to re-run.
-- Afterwards, sign out and sign in again so the session picks up the mark.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'aminekefi416@gmail.com';

-- To remove admin rights again:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role'
-- where email = 'aminekefi416@gmail.com';
```

- [ ] **Step 3: Verify by reading**

Check against the spec's Database section: function names, the six returned columns and their types (`email` cast to `text`, `full_name` from `raw_user_meta_data`), `security definer` + `set search_path = ''`, the admin check is the first statement, errcode `42501`, `revoke ... from public, anon`, `grant ... to authenticated`, `create or replace` (re-runnable), `||` merge (keeps other app metadata).

- [ ] **Step 4: Update `backend/README.md`**

Replace the line `- Sign in / sign up (\`frontend/src/pages/Auth.jsx\`) — UI only, no real auth` with:

```markdown
- Sign in / sign up (`frontend/src/pages/Auth.jsx`) — Supabase Auth
```

and append at the end of the file:

```markdown

## Supabase SQL

`supabase/` holds numbered SQL files. Run each once, in order, in the
Supabase dashboard's SQL Editor (they are safe to re-run):

1. `001_admin_users.sql` — admin check and the admin Users list
2. `002_make_admin.sql` — marks the site owner's account as admin (sign out
   and back in afterwards)
```

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/001_admin_users.sql backend/supabase/002_make_admin.sql backend/README.md
git commit -m "Add Supabase SQL for the admin users list and admin mark"
```

---

### Task 2: Roles and admin redirect rules

**Files:**
- Create: `frontend/src/roles.js`
- Test: `frontend/src/roles.test.js`
- Modify: `frontend/src/redirects.js`
- Test: `frontend/src/redirects.test.js` (append)

**Interfaces:**
- Produces:
  - `roles.js`: `isAdmin(user): boolean`, `homeFor(user): '/admin' | '/app'`
  - `redirects.js`: `adminPagePaths: string[]` (`['/admin']`), `isAdminPath(path): boolean`, `redirectFor(path, signedIn, isAdmin = false): string | null`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/roles.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { homeFor, isAdmin } from './roles.js'

const admin = { email: 'a@x.com', app_metadata: { provider: 'email', role: 'admin' } }
const member = { email: 'm@x.com', app_metadata: { provider: 'email' } }

describe('isAdmin', () => {
  it('is true only for app_metadata.role admin', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(member)).toBe(false)
  })

  it('handles missing users and metadata', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
    expect(isAdmin({ email: 'x@x.com' })).toBe(false)
  })

  it('ignores a role in user_metadata, which users can set themselves', () => {
    expect(isAdmin({ user_metadata: { role: 'admin' }, app_metadata: {} })).toBe(false)
  })
})

describe('homeFor', () => {
  it('sends admins to /admin and everyone else to /app', () => {
    expect(homeFor(admin)).toBe('/admin')
    expect(homeFor(member)).toBe('/app')
  })
})
```

In `frontend/src/redirects.test.js`, change the import line to:

```js
import { adminPagePaths, appPagePaths, isAdminPath, isAppPath, redirectFor, withHash } from './redirects.js'
```

and append at the end of the file:

```js
describe('isAdminPath', () => {
  it('matches /admin and paths under it', () => {
    expect(isAdminPath('/admin')).toBe(true)
    expect(isAdminPath('/admin/users')).toBe(true)
  })

  it('does not match paths that only start with the letters "admin"', () => {
    expect(isAdminPath('/administrator')).toBe(false)
    expect(isAdminPath('/admins')).toBe(false)
    expect(isAdminPath('')).toBe(false)
  })
})

describe('redirectFor and the admin area', () => {
  it.each(['/admin', '/admin/users'])('sends signed-out visitors on %s to /signin', (path) => {
    expect(redirectFor(path, false)).toBe('/signin')
  })

  it.each(['/admin', '/admin/users'])('sends signed-in non-admins on %s to /app', (path) => {
    expect(redirectFor(path, true)).toBe('/app')
    expect(redirectFor(path, true, false)).toBe('/app')
  })

  it('lets admins stay on every admin page', () => {
    for (const path of adminPagePaths) expect(redirectFor(path, true, true)).toBe(null)
  })

  it.each(['/admin/nope', '/admin/users/extra'])('sends admins on unknown %s to /admin', (path) => {
    expect(redirectFor(path, true, true)).toBe('/admin')
  })

  it.each(['', '/signin', '/signup'])('sends admins on %s to /admin', (path) => {
    expect(redirectFor(path, true, true)).toBe('/admin')
  })

  it('lets admins use the user area like anyone else', () => {
    for (const path of appPagePaths) expect(redirectFor(path, true, true)).toBe(null)
    expect(redirectFor('/app/nope', true, true)).toBe('/app')
    expect(redirectFor('/destinations/tozeur', true, true)).toBe('/app/destinations/tozeur')
    expect(redirectFor('/community', true, true)).toBe('/app/community')
  })

  it.each(['/faq', '/reset-password', '/administrator'])('leaves admins on %s alone', (path) => {
    expect(redirectFor(path, true, true)).toBe(null)
  })

  it('leaves signed-out visitors on /administrator alone', () => {
    expect(redirectFor('/administrator', false)).toBe(null)
  })

  it('never carries a hash to /admin', () => {
    expect(withHash('/admin', '#access_token=x')).toBe('/admin')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `roles.test.js` cannot resolve `./roles.js`; `redirects.test.js` fails on the new admin cases (`isAdminPath is not a function` / wrong redirects). Existing 44 tests unaffected apart from the file failing to import new names.

- [ ] **Step 3: Implement `roles.js`**

Create `frontend/src/roles.js`:

```js
// Who someone is, from their Supabase user. The admin mark lives in app_metadata,
// which only SQL or the Supabase dashboard can set (users can edit user_metadata).
export const isAdmin = (user) => user?.app_metadata?.role === 'admin'

// Where someone lands after signing in
export const homeFor = (user) => (isAdmin(user) ? '/admin' : '/app')
```

- [ ] **Step 4: Add the admin rules to `redirects.js`**

In `frontend/src/redirects.js`, after the `appPagePaths` line add:

```js
// Pages that exist under /admin (admins only)
export const adminPagePaths = ['/admin']
```

after the `isAppPath` line add:

```js
export const isAdminPath = (path) => path === '/admin' || path.startsWith('/admin/')
```

and replace the whole `redirectFor` function with:

```js
export function redirectFor(path, signedIn, isAdmin = false) {
  if (!signedIn) return isAppPath(path) || isAdminPath(path) ? '/signin' : null

  if (isAdminPath(path)) {
    if (!isAdmin) return '/app'
    return adminPagePaths.includes(path) ? null : '/admin'
  }
  if (isAppPath(path)) {
    const rest = path.slice('/app'.length)
    return appPagePaths.includes(path) || isCityPath(rest) ? null : '/app'
  }
  if (['', '/signin', '/signup'].includes(path)) return isAdmin ? '/admin' : '/app'
  if (mirrored.includes(path) || isCityPath(path)) return `/app${path}`
  return null
}
```

Also update the file's first comment line to:

```js
// Where to send someone based on the page they opened, whether they're signed in and whether they're an admin.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `redirects.test.js` (the 44 existing plus the new ones) and `roles.test.js`.

- [ ] **Step 6: Commit**

```bash
git add src/roles.js src/roles.test.js src/redirects.js src/redirects.test.js
git commit -m "Add admin role helpers and /admin redirect rules"
```

---

### Task 3: Users page helpers

**Files:**
- Create: `frontend/src/adminUsers.js`
- Test: `frontend/src/adminUsers.test.js`

**Interfaces:**
- Consumes: rows shaped like `admin_list_users()` output: `{ id, email, full_name, created_at, last_sign_in_at, email_confirmed_at }` (timestamps as ISO strings, `full_name`/`last_sign_in_at`/`email_confirmed_at` may be `null`).
- Produces:
  - `userStats(users, now = new Date()): { total, newThisWeek, unconfirmed }`
  - `filterUsers(users, query): users[]`
  - `lastSeen(iso, now = new Date()): string` — `'Never'` for null, `'Just now'` under a minute, `'5m ago'`, `'3h ago'`, `'2d ago'` under 7 days, else `toLocaleDateString()`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/adminUsers.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { filterUsers, lastSeen, userStats } from './adminUsers.js'

const now = new Date('2026-10-15T12:00:00Z')
const DAY = 24 * 3600 * 1000
const ago = (ms) => new Date(now.getTime() - ms).toISOString()

const user = (over) => ({
  id: 'id', email: 'x@x.com', full_name: null, created_at: ago(30 * DAY),
  last_sign_in_at: null, email_confirmed_at: ago(30 * DAY), ...over,
})

describe('userStats', () => {
  it('counts nothing for an empty list', () => {
    expect(userStats([], now)).toEqual({ total: 0, newThisWeek: 0, unconfirmed: 0 })
  })

  it('counts sign-ups from exactly 7 days ago but not 1 ms earlier', () => {
    const users = [user({ created_at: ago(7 * DAY) }), user({ created_at: ago(7 * DAY + 1) }), user({ created_at: ago(DAY) })]
    expect(userStats(users, now).newThisWeek).toBe(2)
  })

  it('counts unconfirmed emails', () => {
    const users = [user({ email_confirmed_at: null }), user({}), user({ email_confirmed_at: null })]
    expect(userStats(users, now)).toEqual({ total: 3, newThisWeek: 0, unconfirmed: 2 })
  })
})

describe('filterUsers', () => {
  const users = [
    user({ id: '1', email: 'leila@mail.com', full_name: 'Leila Ben Ali' }),
    user({ id: '2', email: 'tom@mail.com', full_name: null }),
  ]
  const ids = (list) => list.map((u) => u.id)

  it('returns everyone for an empty or whitespace-only query', () => {
    expect(ids(filterUsers(users, ''))).toEqual(['1', '2'])
    expect(ids(filterUsers(users, '   '))).toEqual(['1', '2'])
  })

  it('matches name or email, ignoring case and surrounding spaces', () => {
    expect(ids(filterUsers(users, '  BEN ali '))).toEqual(['1'])
    expect(ids(filterUsers(users, 'TOM@'))).toEqual(['2'])
    expect(ids(filterUsers(users, 'mail.com'))).toEqual(['1', '2'])
  })

  it('handles users without a name', () => {
    expect(ids(filterUsers(users, 'zzz'))).toEqual([])
  })
})

describe('lastSeen', () => {
  it('says Never when there is no sign-in', () => {
    expect(lastSeen(null, now)).toBe('Never')
  })

  it('uses short relative times for the last week', () => {
    expect(lastSeen(ago(30 * 1000), now)).toBe('Just now')
    expect(lastSeen(ago(5 * 60 * 1000), now)).toBe('5m ago')
    expect(lastSeen(ago(3 * 3600 * 1000), now)).toBe('3h ago')
    expect(lastSeen(ago(2 * DAY), now)).toBe('2d ago')
  })

  it('falls back to the date after a week', () => {
    const iso = ago(10 * DAY)
    expect(lastSeen(iso, now)).toBe(new Date(iso).toLocaleDateString())
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `adminUsers.test.js` cannot resolve `./adminUsers.js`.

- [ ] **Step 3: Implement `adminUsers.js`**

Create `frontend/src/adminUsers.js`:

```js
// Counting, search and dates for the admin Users page; rows come from admin_list_users().

const DAY_MS = 24 * 3600 * 1000

export function userStats(users, now = new Date()) {
  const weekAgo = now.getTime() - 7 * DAY_MS
  return {
    total: users.length,
    newThisWeek: users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
    unconfirmed: users.filter((u) => !u.email_confirmed_at).length,
  }
}

export function filterUsers(users, query) {
  const q = query.trim().toLowerCase()
  if (!q) return users
  return users.filter((u) => [u.email, u.full_name].some((v) => v?.toLowerCase().includes(q)))
}

export function lastSeen(iso, now = new Date()) {
  if (!iso) return 'Never'
  const date = new Date(iso)
  const m = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString()
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all files, including `adminUsers.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/adminUsers.js src/adminUsers.test.js
git commit -m "Add counting, search and date helpers for the admin Users page"
```

---

### Task 4: Admin layout, Users page and styles

**Files:**
- Modify: `frontend/src/data.js` (after `appNavLinks`)
- Create: `frontend/src/sections/AdminLayout.jsx`
- Create: `frontend/src/pages/admin/AdminUsers.jsx`
- Modify: `frontend/src/styles.css` (new Admin block; mobile rules)

**Interfaces:**
- Consumes: `userStats`, `filterUsers`, `lastSeen` (Task 3); `supabase` from `src/supabase.js`; `currentPath` from `src/route.js`; `Switcher` from `src/components/Switcher.jsx`.
- Produces:
  - `adminNavLinks: [label, href][]` in `data.js`
  - `<AdminLayout user={User} onSignOut={() => void}>{children}</AdminLayout>` (default export)
  - `<AdminUsers />` (default export; ignores props)

These are not wired into `App.jsx` until Task 5; verification is `npm test && npm run build`.

- [ ] **Step 1: Add `adminNavLinks`**

In `frontend/src/data.js`, directly after the `appNavLinks` array, add:

```js

// Sidebar of the admin area; sections are added as they're built.
export const adminNavLinks = [
  ['Users', '/admin'],
]
```

- [ ] **Step 2: Create `AdminLayout.jsx`**

Create `frontend/src/sections/AdminLayout.jsx`:

```jsx
import { useState } from 'react'
import { Compass, ExternalLink, LogOut, Menu, Users, X } from 'lucide-react'
import { adminNavLinks, brand } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'

const icons = { '/admin': Users }

// Sidebar shell for /admin pages; becomes a top bar with a menu on phones.
export default function AdminLayout({ user, onSignOut, children }) {
  const [open, setOpen] = useState(false)
  const name = user.user_metadata?.full_name || user.email

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-side__top">
          <a href="/admin" className="logo">
            <Compass size={28} strokeWidth={2.2} />
            <span>{brand.name}<small className="admin-side__label">Admin</small></span>
          </a>
          <button type="button" className="admin-menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>

        <nav className={`admin-nav ${open ? 'admin-nav--open' : ''}`}>
          {adminNavLinks.map(([label, href]) => {
            const Icon = icons[href]
            return (
              <a key={href} href={href} className={href === currentPath ? 'active' : ''} aria-current={href === currentPath ? 'page' : undefined}>
                {Icon && <Icon size={18} />} {label}
              </a>
            )
          })}

          <div className="admin-nav__bottom">
            <a href="/app"><ExternalLink size={18} /> View site</a>
            <button type="button" onClick={onSignOut}><LogOut size={18} /> Sign out</button>
            <div className="admin-side__user">
              <span title={user.email}>{name}</span>
              <Switcher />
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create `AdminUsers.jsx`**

Create `frontend/src/pages/admin/AdminUsers.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import { filterUsers, lastSeen, userStats } from '../../adminUsers.js'

// Read-only list of every account, from the admin-only admin_list_users() function.
export default function AdminUsers() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setError(null)
    setUsers(null)
    try {
      const { data, error } = await supabase.rpc('admin_list_users')
      if (error) setError(error)
      else setUsers(data ?? [])
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Users - Aaslema Admin'
    load()
  }, [])

  return (
    <>
      <h1>Users</h1>
      {error ? (
        error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load users: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )
      ) : users === null ? (
        <p className="admin-note">Loading users…</p>
      ) : (
        <UsersTable users={users} query={query} onQuery={setQuery} />
      )}
    </>
  )
}

function UsersTable({ users, query, onQuery }) {
  const stats = userStats(users)
  const shown = filterUsers(users, query)

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat"><strong>{stats.total}</strong><span>Total users</span></div>
        <div className="admin-stat"><strong>{stats.newThisWeek}</strong><span>New this week</span></div>
        <div className="admin-stat"><strong>{stats.unconfirmed}</strong><span>Unconfirmed emails</span></div>
      </div>

      <input
        type="search"
        className="admin-search"
        placeholder="Search by name or email"
        aria-label="Search users"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />

      {shown.length === 0 ? (
        <p className="admin-note">No users match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Joined</th><th>Last sign-in</th><th>Status</th></tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name || '—'}</td>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>{lastSeen(u.last_sign_in_at)}</td>
                  <td>
                    {u.email_confirmed_at
                      ? <span className="admin-badge admin-badge--ok">Confirmed</span>
                      : <span className="admin-badge admin-badge--warn">Unconfirmed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Add the styles**

In `frontend/src/styles.css`, directly before the first `@media (max-width: 1199px)` block (around line 841), add:

```css
/* ---------- Admin ---------- */
.admin { display: grid; grid-template-columns: 250px 1fr; min-height: 100vh; background: var(--lighter); }
.admin-side {
  position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 28px;
  padding: 28px 18px; background: var(--heading); color: var(--white);
}
.admin-side__top { display: flex; align-items: center; justify-content: space-between; padding: 0 6px; }
.admin-side .logo { font-size: 24px; line-height: 1.1; }
.admin-side__label { display: block; color: var(--dark-muted); font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }
.admin-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.admin-nav a, .admin-nav button {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 0; border-radius: 8px;
  background: none; color: var(--white); font: inherit; font-weight: 500; text-align: left; cursor: pointer;
}
.admin-nav a:hover, .admin-nav button:hover { background: rgba(255, 255, 255, 0.06); }
.admin-nav a.active { background: var(--primary); }
.admin-nav__bottom { display: flex; flex-direction: column; gap: 4px; margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.admin-side__user { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px 0; color: var(--dark-muted); font-size: 14px; }
.admin-side__user span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-menu-toggle { display: none; background: none; border: 0; color: var(--white); cursor: pointer; }
.admin-main { min-width: 0; padding: 40px; }
.admin-main h1 { margin-bottom: 24px; color: var(--title); font-size: 32px; }
.admin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.admin-stat { padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.admin-stat strong { display: block; color: var(--title); font-size: 30px; }
.admin-stat span { color: var(--text); font-size: 14px; }
.admin-search {
  width: 100%; max-width: 360px; margin-bottom: 16px; padding: 10px 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--title); font: inherit;
}
.admin-table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.admin-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.admin-table th, .admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
.admin-table th { background: var(--lighter); color: var(--title); font-weight: 600; }
.admin-table tr:last-child td { border-bottom: 0; }
.admin-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 500; }
.admin-badge--ok { background: var(--tint); color: var(--primary-dark); }
.admin-badge--warn { background: rgba(247, 146, 30, 0.12); color: var(--secondary); }
.admin-note { padding: 24px 0; color: var(--text); }
.admin-note--error { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; color: #c0392b; }
```

Inside the existing `@media (max-width: 991px)` block, at its end (before its closing `}`), add:

```css
  .admin { grid-template-columns: 1fr; }
  .admin-side { z-index: 10; height: auto; gap: 0; padding: 14px 16px; }
  .admin-menu-toggle { display: block; }
  .admin-nav { display: none; padding-top: 12px; }
  .admin-nav--open { display: flex; }
  .admin-main { padding: 24px 16px; }
  .admin-stats { grid-template-columns: 1fr; }
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; build prints `✓ built in`.

- [ ] **Step 6: Commit**

```bash
git add src/data.js src/sections/AdminLayout.jsx src/pages/admin/AdminUsers.jsx src/styles.css
git commit -m "Add admin sidebar layout and read-only Users page"
```

---

### Task 5: Wire the admin area in

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/sections/AppHeader.jsx` (nav block, ~line 34)
- Modify: `frontend/src/pages/Auth.jsx` (`signIn`, ~line 101)

**Interfaces:**
- Consumes: `isAdmin`, `homeFor` (Task 2, `roles.js`); `isAdminPath`, `redirectFor(path, signedIn, isAdmin)` (Task 2); `AdminLayout`, `AdminUsers` (Task 4); existing `useUser()` (undefined while loading, then user or null).

- [ ] **Step 1: Update `App.jsx`**

In `frontend/src/App.jsx`:

Add imports after the `import Profile ...` line:

```jsx
import AdminLayout from './sections/AdminLayout.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
```

Change the redirects import and add the roles import:

```jsx
import { isAdminPath, isAppPath, redirectFor, withHash } from './redirects.js'
import { isAdmin } from './roles.js'
```

Replace the four lines from `const inApp = ...` through `const Page = ...` with:

```jsx
// Admin area; keys must match adminPagePaths in redirects.js
const adminPages = { '/admin': AdminUsers }
const inApp = isAppPath(currentPath)
const inAdmin = isAdminPath(currentPath)
const cityId = currentPath.match(/^\/(?:app\/)?destinations\/([^/]+)$/)?.[1]
const Page = cityId ? () => <CityDetail id={cityId} /> : (inAdmin ? adminPages : inApp ? appPages : pages)[currentPath]
```

Replace the `redirect` and `ready` lines with:

```jsx
  const redirect = user === undefined || signingOut ? null : redirectFor(currentPath, user !== null, isAdmin(user))
  const ready = user !== undefined && !redirect && !(inApp && !user) && !(inAdmin && !isAdmin(user))
```

Replace `if (!ready) return null` with:

```jsx
  if (!ready) return null

  if (inAdmin) return <AdminLayout user={user} onSignOut={signOut}><Page user={user} /></AdminLayout>
```

(The rest of the render stays as it is.)

- [ ] **Step 2: Add the "Admin" link to `AppHeader.jsx`**

In `frontend/src/sections/AppHeader.jsx`, add after the `import { currentPath } ...` line:

```jsx
import { isAdmin } from '../roles.js'
```

and right after the `{appNavLinks.map(...)}` block (before the `{/* The header's Sign Out button ... */}` comment), add:

```jsx
          {isAdmin(user) && <a href="/admin" onClick={() => setOpen(false)}>Admin</a>}
```

- [ ] **Step 3: Send admins to `/admin` after sign in**

In `frontend/src/pages/Auth.jsx`, add to the imports:

```jsx
import { homeFor } from '../roles.js'
```

and in `signIn` replace:

```jsx
    const { error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') })
    if (error) return { text: error.message, error: true }
    window.location.assign('/app')
```

with:

```jsx
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') })
    if (error) return { text: error.message, error: true }
    window.location.assign(homeFor(data.user))
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/sections/AppHeader.jsx src/pages/Auth.jsx
git commit -m "Route admins into the /admin area"
```

- [ ] **Step 6: Manual check (site owner, in the browser)**

After running `backend/supabase/001_admin_users.sql` then `002_make_admin.sql` in the Supabase SQL Editor, rebuild (`docker compose up -d --build` or `npm run dev`), sign out and sign in as `aminekefi416@gmail.com`:

1. Admin sign in → lands on `/admin` with the sidebar. (Before signing in again after the SQL, an old session lands on `/app` instead — expected.)
2. Totals and table show real accounts; search narrows by name and by email.
3. "View site" → `/app`; the user navbar shows "Admin"; it goes back to `/admin`.
4. A normal user opening `/admin` lands on `/app` and sees no "Admin" link.
5. Signed out, open `/admin` → `/signin`.
6. Phone width: the sidebar becomes a top bar; the menu opens the links.
7. Sign out from the sidebar → `/`; sign out from the user navbar while admin → `/`.
8. In the Supabase SQL Editor, `select * from public.admin_list_users();` → error "not allowed".
