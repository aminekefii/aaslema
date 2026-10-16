# My Moments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "My moments" as the first profile dashboard section (at `/app/profile`), listing the user's own moments with photo, status, destination, highlight, caption, posted time and likes; Edit profile moves to `/app/profile/edit`.

**Architecture:** `011_my_moments.sql` adds a security-definer `my_moments()` RPC (own rows + like counts) and a storage policy letting uploaders read their own photos. `momentsApi.fetchMyMoments` adds signed photo links; pure `moments.myMomentCard` shapes rows into cards; `MyMoments.jsx` renders them inside `ProfileLayout`.

**Tech Stack:** React 18 + Vite, Supabase (RPC, Storage signed URLs, RLS policies), Vitest, lucide-react 0.460.

**Spec:** `docs/superpowers/specs/2026-10-16-my-moments-design.md`

## Global Constraints

- SQL file `backend/supabase/011_my_moments.sql`, after 007 and 008; safe to re-run; separate policy name `"Moment photos: uploader reads their own"`.
- All of the user's moments, newest first, max 100; view only (no buttons that change data).
- Sidebar order: My moments (`/app/profile`, `Camera`), Edit profile (`/app/profile/edit`, `UserPen`), Rate your trip (`/app/profile/review`, `Star`).
- Email-change links return to `/app/profile/edit`.
- Copy (exact): "My moments", "Photos you shared from destinations.", "Loading your moments…", "Couldn't load your moments.", "Try again", "You haven't shared any moments yet.", "Explore destinations", "Published", "Waiting for approval", "Photo unavailable".
- Grid 3 / 2 / 1 columns at ≥ 992 / ≥ 576 / smaller.
- API functions never throw. Tests: Vitest, pure functions; from `frontend/`: `npx vitest run`.
- Style: 2-space indent, no semicolons, single quotes, short "why" comments.

## Review Focus

1. A moment whose destination id no longer exists in `cities.js` → card shows the raw id, no crash. Pinned in Task 2 tests.
2. A moment whose photo link can't be made (file missing, or 011 not run yet so the pending photo is unreadable) → "Photo unavailable" box, card still shown. Pinned in Task 2 tests (`url: null`) and the Task 3 manual check.
3. Before `011` is run, `my_moments` doesn't exist → "Couldn't load your moments." + Try again, not a blank page. Pinned in Task 3 (null → error state) and manual check.
4. Old bookmarks of `/app/profile` (expecting Edit profile) land on My moments, which is inside the dashboard with Edit profile one click away — acceptable; email-change links go to `/app/profile/edit`. Pinned in Task 3 (`emailRedirectTo`) and redirect test.
5. Another user's pending photo must stay unreadable. Pinned by the folder check in Task 1's policy and manual security check 7.

---

### Task 1: SQL: `my_moments()` and the uploader read policy

**Files:**
- Create: `backend/supabase/011_my_moments.sql`

**Interfaces:**
- Produces: `rpc('my_moments')` → rows `{ id, city_id, spot, caption, image_path, created_at, approved_at, likes }`; uploaders can `createSignedUrls` for files in their own folder of `moments`.

- [ ] **Step 1: Write the file** with exactly the spec's SQL block:

```sql
-- My moments: a user's own moments with like counts, and their own photos (pending ones too).
-- Run after 007_moments.sql and 008_moment_likes.sql. Safe to re-run.

-- The caller's moments, newest first. Runs as the owner so likes from everyone are counted.
create or replace function public.my_moments()
returns table (id uuid, city_id text, spot text, caption text, image_path text, created_at timestamptz, approved_at timestamptz, likes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.city_id, m.spot, m.caption, m.image_path, m.created_at, m.approved_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id)
  from public.moments m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit 100
$$;

revoke all on function public.my_moments() from public;
grant execute on function public.my_moments() to authenticated;

-- Uploaders see their own photos, pending ones included (adds to "Moment photos: admins, or published")
drop policy if exists "Moment photos: uploader reads their own" on storage.objects;
create policy "Moment photos: uploader reads their own" on storage.objects
  for select to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Check** the file equals the spec's SQL block (no database here; the owner runs it).

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/011_my_moments.sql
git commit -m "My moments: my_moments() and uploader photo access (011)"
```

---

### Task 2: `myMomentCard` (TDD) and `fetchMyMoments`

**Files:**
- Modify: `frontend/src/moments.js` (add `myMomentCard` at the end)
- Test: `frontend/src/moments.test.js`
- Modify: `frontend/src/momentsApi.js` (add `fetchMyMoments` after `fetchPublishedMoments`)

**Interfaces:**
- Consumes: `photoUrls(paths)` (same file).
- Produces: `myMomentCard(row, cityList) → { key, url, cityName, spot, caption, published, postedAt, likes }`; `fetchMyMoments() → Promise<row[] | null>` where rows are `my_moments` rows plus `url`.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/moments.test.js`, add `myMomentCard` to the import list from `./moments.js`, and append:

```js
describe('myMomentCard', () => {
  const list = [{ id: 'tozeur', name: 'Tozeur' }]
  const row = {
    id: 'm1', city_id: 'tozeur', spot: 'Chebika', caption: 'Oasis at dawn', image_path: 'u/p.jpg',
    created_at: '2026-10-16T10:00:00Z', approved_at: null, likes: '3', url: 'https://x/p.jpg',
  }

  it('builds a card for a pending moment', () => {
    expect(myMomentCard(row, list)).toEqual({
      key: 'm1', url: 'https://x/p.jpg', cityName: 'Tozeur', spot: 'Chebika', caption: 'Oasis at dawn',
      published: false, postedAt: '2026-10-16T10:00:00Z', likes: 3,
    })
  })

  it('marks an approved moment as published', () => {
    expect(myMomentCard({ ...row, approved_at: '2026-10-16T12:00:00Z' }, list).published).toBe(true)
  })

  it('falls back to the city id, no photo and no likes', () => {
    const card = myMomentCard({ ...row, city_id: 'gone', url: undefined, likes: undefined }, list)
    expect(card.cityName).toBe('gone')
    expect(card.url).toBeNull()
    expect(card.likes).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run (in `frontend/`): `npx vitest run src/moments.test.js`
Expected: FAIL — `myMomentCard is not a function` (or not exported).

- [ ] **Step 3: Implement**

Append to `frontend/src/moments.js`:

```js
// A row of my_moments() (plus its photo link) → a My moments card
export function myMomentCard(row, cityList) {
  return {
    key: row.id,
    url: row.url ?? null,
    cityName: cityList.find((c) => c.id === row.city_id)?.name ?? row.city_id,
    spot: row.spot,
    caption: row.caption,
    published: Boolean(row.approved_at),
    postedAt: row.created_at,
    likes: Number(row.likes ?? 0),
  }
}
```

In `frontend/src/momentsApi.js`, after `fetchPublishedMoments`, add:

```js
// The signed-in user's moments, pending ones too, with photo links; null if loading failed
export async function fetchMyMoments() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('my_moments')
    if (error) return null
    const rows = data ?? []
    // Uploaders can read their own photos (011_my_moments.sql); a missing link shows "Photo unavailable"
    const urls = await photoUrls(rows.map((r) => r.image_path))
    return rows.map((r) => ({ ...r, url: urls[r.image_path] }))
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run the suite and build**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all PASS (3 more tests); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/moments.js frontend/src/moments.test.js frontend/src/momentsApi.js
git commit -m "My moments: card helper and loading the user's moments"
```

---

### Task 3: Routing, sidebar, My moments page; checkpoint

**Files:**
- Test: `frontend/src/redirects.test.js` (the "stays on %s" list, ~line 42)
- Modify: `frontend/src/redirects.js` (`appPagePaths`)
- Modify: `frontend/src/App.jsx` (import `MyMoments`; `appPages`)
- Modify: `frontend/src/data.js` (`profileNavLinks`)
- Modify: `frontend/src/sections/ProfileLayout.jsx` (icons)
- Modify: `frontend/src/profileApi.js` (`emailRedirectTo`)
- Create: `frontend/src/pages/MyMoments.jsx`
- Modify: `frontend/src/styles.css` (Profile dashboard block, before its `@media (max-width: 991px)`)
- Modify: `CHECKPOINT.md`

**Interfaces:**
- Consumes: `fetchMyMoments`, `myMomentCard` (Task 2); `cities` from `cities.js`; `timeAgo` from `timeAgo.js`; `inProfile` in `App.jsx`.

- [ ] **Step 1: Failing redirect test**

In `frontend/src/redirects.test.js`, in the `it.each([...])('stays on %s', …)` list that ends with `'/app/profile'`, add `'/app/profile/edit'` after `'/app/profile'`.

Run (in `frontend/`): `npx vitest run src/redirects.test.js`
Expected: FAIL — "stays on /app/profile/edit" gets `'/app'` instead of `null`.

- [ ] **Step 2: Paths**

In `frontend/src/redirects.js`, change `appPagePaths` to:

```js
export const appPagePaths = ['/app', '/app/destinations', '/app/festivals', '/app/community', '/app/contact', '/app/planner', '/app/profile', '/app/profile/edit', '/app/profile/review']
```

Run (in `frontend/`): `npx vitest run src/redirects.test.js` — Expected: PASS.

- [ ] **Step 3: Sidebar, icons, routes, email link**

`frontend/src/data.js` — replace `profileNavLinks` with:

```js
export const profileNavLinks = [
  ['My moments', '/app/profile'],
  ['Edit profile', '/app/profile/edit'],
  ['Rate your trip', '/app/profile/review'],
]
```

`frontend/src/sections/ProfileLayout.jsx` — import line becomes `import { Camera, Menu, Star, UserPen, X } from 'lucide-react'`, and:

```js
const icons = { '/app/profile': Camera, '/app/profile/edit': UserPen, '/app/profile/review': Star }
```

`frontend/src/App.jsx` — add `import MyMoments from './pages/MyMoments.jsx'` next to the `EditProfile` import; in `appPages` replace `'/app/profile': inProfile(EditProfile), '/app/profile/review': inProfile(Review)` with:

```js
'/app/profile': inProfile(MyMoments), '/app/profile/edit': inProfile(EditProfile), '/app/profile/review': inProfile(Review)
```

`frontend/src/profileApi.js` — in `changeEmail`, `` `${window.location.origin}/app/profile` `` becomes `` `${window.location.origin}/app/profile/edit` ``.

- [ ] **Step 4: The page**

Create `frontend/src/pages/MyMoments.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { Heart, Navigation } from 'lucide-react'
import { cities } from '../cities.js'
import { myMomentCard } from '../moments.js'
import { fetchMyMoments } from '../momentsApi.js'
import { timeAgo } from '../timeAgo.js'

// Profile dashboard: every moment the user uploaded, pending ones too. View only.
export default function MyMoments() {
  // undefined while loading, null if loading failed
  const [moments, setMoments] = useState(undefined)

  const load = useCallback(async () => {
    setMoments(undefined)
    const rows = await fetchMyMoments()
    setMoments(rows && rows.map((r) => myMomentCard(r, cities)))
  }, [])

  useEffect(() => {
    document.title = 'My moments - Aaslema'
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <h1>My moments</h1>
      <p className="profile-card__lead">Photos you shared from destinations.</p>
      {moments === undefined && <p className="profile-note">Loading your moments…</p>}
      {moments === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load your moments.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {moments?.length === 0 && (
        <p className="profile-note">You haven't shared any moments yet. <a href="/app/destinations">Explore destinations</a></p>
      )}
      {moments?.length > 0 && (
        <div className="my-moments">
          {moments.map((m) => (
            <article key={m.key} className="my-moment">
              {m.url
                ? <img src={m.url} alt={m.caption} className="my-moment__photo" />
                : <div className="my-moment__photo my-moment__photo--missing">Photo unavailable</div>}
              <div className="my-moment__body">
                <span className={`admin-badge ${m.published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>
                  {m.published ? 'Published' : 'Waiting for approval'}
                </span>
                <strong>{m.cityName}</strong>
                {m.spot && <p className="my-moment__spot"><Navigation size={12} /> {m.spot}</p>}
                <p className="my-moment__caption">{m.caption}</p>
                <div className="my-moment__footer">
                  <time dateTime={m.postedAt}>{timeAgo(m.postedAt)}</time>
                  {m.published && (
                    <span className="my-moment__likes" aria-label={`${m.likes} likes`}>
                      <Heart size={14} aria-hidden="true" /> {m.likes}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 5: Styles**

In `frontend/src/styles.css`, inside the Profile dashboard block, just before its `@media (max-width: 991px) {`, add:

```css
.my-moments { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
.my-moment { display: flex; flex-direction: column; overflow: hidden; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.my-moment__photo { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--lighter); }
.my-moment__photo--missing { display: grid; place-items: center; color: var(--text); font-size: 14px; }
.my-moment__body { display: grid; justify-items: start; gap: 6px; padding: 14px 16px 16px; }
.my-moment__body strong { color: var(--title); overflow-wrap: anywhere; }
.my-moment__spot { display: flex; align-items: center; gap: 4px; margin: 0; color: var(--primary); font-size: 13px; }
.my-moment__caption { margin: 0; font-size: 15px; overflow-wrap: anywhere; }
.my-moment__footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; font-size: 13px; }
.my-moment__likes { display: inline-flex; align-items: center; gap: 4px; }
.my-moments__error { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
```

and add `.my-moments { grid-template-columns: repeat(2, minmax(0, 1fr)); }` inside the block's `@media (max-width: 991px)` and `.my-moments { grid-template-columns: 1fr; }` inside its `@media (max-width: 575px)`.

- [ ] **Step 6: Verify**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all PASS; build succeeds.

- [ ] **Step 7: Browser check (or list for the owner)** — spec "Manual (owner)" items 2–6; plus Review Focus 2/3: before 011 the page shows the error with Try again; a pending moment shows its photo after 011.

- [ ] **Step 8: Checkpoint**

In `CHECKPOINT.md`: test count; SQL `001`–`011` and add `011_my_moments.sql` to the "applied" list; Waiting on you: run `011`, allow `<site>/app/profile/edit` as a redirect URL, the spec's manual list; Done row "My moments in the profile dashboard (`011_my_moments.sql`); Edit profile moved to `/app/profile/edit`" | `2026-10-16-my-moments` | commits; Next item 3: drop "My moments" from the future sections list.

- [ ] **Step 9: Commit**

```bash
git add frontend/src CHECKPOINT.md
git commit -m "My moments: first section of the profile dashboard"
```
