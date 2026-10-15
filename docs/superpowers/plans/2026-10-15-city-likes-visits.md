# Destination Likes and Visits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users like destinations (shared counts) and mark them visited (personal), stored in Supabase; the Destinations page shows real counts and blurred "Visited" cards, the city page saves likes and visits.

**Architecture:** Two Supabase tables (`city_likes`, `city_visits`) keyed by (user, city) with row level security so users manage only their own rows, plus a `security definer` function `city_like_counts()` that returns only numbers. The frontend wraps all Supabase calls in `cityActivity.js` (never throws) and keeps count maths in pure, tested `cityCounts.js`. Pages update the UI immediately and roll back if saving fails.

**Tech Stack:** React 18, Vite 5, Supabase JS v2, Postgres (Supabase RLS), lucide-react, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-10-15-city-likes-visits-design.md`

## Global Constraints

- Frontend commands run from `frontend/`; SQL lives in `backend/supabase/`.
- Only signed-in users like or mark visited; everyone (including signed-out visitors) sees like counts.
- Clients insert only `city_id`; `user_id` always comes from the session. Users read and delete only their own rows. No updates.
- Visits are never shown or counted for other users.
- Add to plan and moments keep using browser storage (`planned_cities`, `moments_<id>`); only the `liked_cities` / `visited_cities` storage goes.
- `city.likes` from `cities.js` is no longer used for display.
- Copy strings (verbatim): "Sign in to like and track your visits." / "Couldn't save that. Please try again." / "Visited" / "Liked" / "Like" / "Mark as visited".
- Match surrounding code: no semicolons, single quotes, 2-space indent, short `//` comments only where the why isn't obvious.

## Review Focus

1. **Saving fails (offline, expired session)** — the button must flip back, the count must return to its previous value, and "Couldn't save that. Please try again." must show. Pinned by Task 4's rollback code and manual check 6.
2. **Double-clicking Like** — must not send two requests or count twice. Pinned by Task 4 (button disabled while saving) and Task 1 (primary key; duplicate insert treated as success in Task 3's `setCityFlag`).
3. **Counts fail to load** — cards and the city page must show no number rather than a wrong 0, and liking must still save. Pinned by Task 2 (`likeCount` on `null`), Task 3 (blank count) and Task 4 (count adjustment skipped when `counts` is `null`).
4. **Supabase `bigint` arriving as a string** — counts must still add up (`"2" + 1` must be 3, not "21"). Pinned by Task 2 tests.
5. **Signed-out visitor clicks Like** — nothing is saved, the sign-in note appears. Pinned by Task 4 and manual check 1.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/supabase/004_city_likes_visits.sql` (new) | tables, grants, RLS, `city_like_counts()` |
| `backend/README.md` | step 4 in the SQL list |
| `frontend/src/cityCounts.js` (new) + test | count map maths, id list toggling |
| `frontend/src/cityActivity.js` (new) | Supabase calls for likes/visits |
| `frontend/src/pages/Destinations.jsx` | real counts, visited cards |
| `frontend/src/pages/CityDetail.jsx` | like/visit saving, notes, hero label |
| `frontend/src/App.jsx` | pass `user` to `CityDetail` |
| `frontend/src/styles.css` | visited card/hero styles, note |

---

### Task 1: SQL for likes and visits

**Files:**
- Create: `backend/supabase/004_city_likes_visits.sql`
- Modify: `backend/README.md` (Supabase SQL list)

**Interfaces:**
- Produces: tables `public.city_likes` and `public.city_visits` (`user_id uuid default auth.uid()`, `city_id text`, `created_at timestamptz`, primary key `(user_id, city_id)`); authenticated users may `select`/`delete` their own rows and `insert (city_id)`; `public.city_like_counts() returns table (city_id text, likes bigint)` executable by `anon` and `authenticated`. Duplicate insert raises code `23505`.

No database in the test setup: verify by reading.

- [ ] **Step 1: Create `backend/supabase/004_city_likes_visits.sql`**

```sql
-- Destination likes (shared counts) and visits (personal). Signed-in users manage
-- only their own rows. Safe to re-run, but re-running does not change existing
-- tables: alter their constraints by hand if they change later.

create table if not exists public.city_likes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create table if not exists public.city_visits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

alter table public.city_likes enable row level security;
alter table public.city_visits enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.city_likes, public.city_visits from anon, authenticated;
grant select, delete on public.city_likes, public.city_visits to authenticated;
grant insert (city_id) on public.city_likes, public.city_visits to authenticated;

drop policy if exists "Users read their own likes" on public.city_likes;
create policy "Users read their own likes" on public.city_likes
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users add their own likes" on public.city_likes;
create policy "Users add their own likes" on public.city_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove their own likes" on public.city_likes;
create policy "Users remove their own likes" on public.city_likes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Users read their own visits" on public.city_visits;
create policy "Users read their own visits" on public.city_visits
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users add their own visits" on public.city_visits;
create policy "Users add their own visits" on public.city_visits
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove their own visits" on public.city_visits;
create policy "Users remove their own visits" on public.city_visits
  for delete to authenticated using (user_id = auth.uid());

-- Like counts per city for everyone, without revealing who liked what.
create or replace function public.city_like_counts()
returns table (city_id text, likes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.city_id, count(*) from public.city_likes l group by l.city_id
$$;

revoke all on function public.city_like_counts() from public;
grant execute on function public.city_like_counts() to anon, authenticated;
```

- [ ] **Step 2: Add step 4 to `backend/README.md`**

In the "Supabase SQL" numbered list, after the `3. \`003_contact_messages.sql\` …` item, add:

```markdown
4. `004_city_likes_visits.sql` — destination likes (shared counts) and visits (personal)
```

- [ ] **Step 3: Verify by reading**

Check against the spec's Database section: both tables identical in shape; RLS enabled on both; `revoke all ... from anon, authenticated`; insert grant is only `(city_id)`; select and delete granted to `authenticated` only; no update grant; all six policies compare `user_id = auth.uid()`; the function is `security definer` with `search_path = ''`, returns only `city_id` and a count, is revoked from `public` and granted to `anon, authenticated`; every statement is re-runnable.

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/004_city_likes_visits.sql backend/README.md
git commit -m "Add Supabase tables for destination likes and visits"
```

---

### Task 2: Count helpers

**Files:**
- Create: `frontend/src/cityCounts.js`
- Test: `frontend/src/cityCounts.test.js`

**Interfaces:**
- Produces:
  - `countsFromRows(rows): { [cityId]: number }` — `rows` is `[{ city_id, likes }]`, `likes` a number or numeric string
  - `likeCount(counts, cityId): number` — `0` when `counts` is `null`/`undefined` or the city is missing
  - `adjustCount(counts, cityId, delta): object` — new object, count never below 0
  - `toggleId(ids, cityId, on): string[]` — new array

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/cityCounts.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { adjustCount, countsFromRows, likeCount, toggleId } from './cityCounts.js'

describe('countsFromRows', () => {
  it('turns rows into numbers per city, including bigint strings', () => {
    expect(countsFromRows([{ city_id: 'tozeur', likes: '2' }, { city_id: 'tunis', likes: 5 }])).toEqual({ tozeur: 2, tunis: 5 })
  })

  it('returns an empty map for no rows', () => {
    expect(countsFromRows([])).toEqual({})
  })
})

describe('likeCount', () => {
  it('reads a city count, 0 when missing', () => {
    expect(likeCount({ tozeur: 2 }, 'tozeur')).toBe(2)
    expect(likeCount({ tozeur: 2 }, 'tunis')).toBe(0)
  })

  it('is 0 when counts are not loaded', () => {
    expect(likeCount(null, 'tozeur')).toBe(0)
    expect(likeCount(undefined, 'tozeur')).toBe(0)
  })
})

describe('adjustCount', () => {
  it('adds and removes a like', () => {
    expect(adjustCount({ tozeur: 2 }, 'tozeur', 1)).toEqual({ tozeur: 3 })
    expect(adjustCount({ tozeur: 2 }, 'tozeur', -1)).toEqual({ tozeur: 1 })
    expect(adjustCount({}, 'tozeur', 1)).toEqual({ tozeur: 1 })
  })

  it('adds numerically after countsFromRows', () => {
    expect(adjustCount(countsFromRows([{ city_id: 'tozeur', likes: '2' }]), 'tozeur', 1)).toEqual({ tozeur: 3 })
  })

  it('never goes below 0', () => {
    expect(adjustCount({ tozeur: 0 }, 'tozeur', -1)).toEqual({ tozeur: 0 })
  })

  it('leaves other cities and the input untouched', () => {
    const counts = { tozeur: 2, tunis: 5 }
    expect(adjustCount(counts, 'tozeur', 1)).toEqual({ tozeur: 3, tunis: 5 })
    expect(counts).toEqual({ tozeur: 2, tunis: 5 })
  })
})

describe('toggleId', () => {
  it('adds an id once and removes it', () => {
    expect(toggleId(['tunis'], 'tozeur', true)).toEqual(['tunis', 'tozeur'])
    expect(toggleId(['tunis', 'tozeur'], 'tozeur', true)).toEqual(['tunis', 'tozeur'])
    expect(toggleId(['tunis', 'tozeur'], 'tozeur', false)).toEqual(['tunis'])
  })

  it('does not change the input', () => {
    const ids = ['tunis']
    toggleId(ids, 'tozeur', true)
    expect(ids).toEqual(['tunis'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `cityCounts.test.js` cannot resolve `./cityCounts.js`.

- [ ] **Step 3: Implement `cityCounts.js`**

Create `frontend/src/cityCounts.js`:

```js
// Like counts per destination: turning rows into a lookup and adjusting it after a click.

// Supabase sends bigint counts as strings, so convert them
export function countsFromRows(rows) {
  const counts = {}
  for (const { city_id, likes } of rows) counts[city_id] = Number(likes)
  return counts
}

export const likeCount = (counts, cityId) => counts?.[cityId] ?? 0

export function adjustCount(counts, cityId, delta) {
  return { ...counts, [cityId]: Math.max(0, likeCount(counts, cityId) + delta) }
}

export function toggleId(ids, cityId, on) {
  const rest = ids.filter((id) => id !== cityId)
  return on ? [...rest, cityId] : rest
}
```

Note: `toggleId(['tunis', 'tozeur'], 'tozeur', true)` returns `['tunis', 'tozeur']` (removed then re-added at the end — same contents, no duplicate).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all files, including `cityCounts.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/cityCounts.js src/cityCounts.test.js
git commit -m "Add like-count helpers for destinations"
```

---

### Task 3: Supabase calls and the Destinations page

**Files:**
- Create: `frontend/src/cityActivity.js`
- Modify: `frontend/src/pages/Destinations.jsx`
- Modify: `frontend/src/styles.css:434-444` (guide card rules)

**Interfaces:**
- Consumes: `countsFromRows`, `likeCount` (Task 2); `supabase` (client or `null`) from `src/supabase.js`; tables and function from Task 1. `App` already renders `<Destinations user={user} />` (`user` is `null` when signed out).
- Produces (all `async`, never throw):
  - `fetchLikeCounts(): Promise<{ [cityId]: number } | null>`
  - `fetchMyCityIds(table: 'city_likes' | 'city_visits'): Promise<string[]>`
  - `setCityFlag(table, cityId, on: boolean): Promise<boolean>`

- [ ] **Step 1: Create `cityActivity.js`**

Create `frontend/src/cityActivity.js`:

```js
import { supabase } from './supabase.js'
import { countsFromRows } from './cityCounts.js'

// Destination likes and visits in Supabase. None of these throw: pages get a plain value back.

export async function fetchLikeCounts() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('city_like_counts')
    return error ? null : countsFromRows(data ?? [])
  } catch {
    return null
  }
}

// Row level security limits this to the signed-in user's own rows
export async function fetchMyCityIds(table) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from(table).select('city_id')
    return error ? [] : (data ?? []).map((row) => row.city_id)
  } catch {
    return []
  }
}

export async function setCityFlag(table, cityId, on) {
  if (!supabase) return false
  try {
    const { error } = on
      ? await supabase.from(table).insert({ city_id: cityId })
      : await supabase.from(table).delete().eq('city_id', cityId)
    // Already liked or visited (duplicate key) is the state we wanted
    return !error || (on && error.code === '23505')
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Update `Destinations.jsx`**

In `frontend/src/pages/Destinations.jsx`:

Replace the imports with:

```jsx
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Heart, Search, Users } from 'lucide-react'
import { cities } from '../cities.js'
import { base } from '../route.js'
import { likeCount } from '../cityCounts.js'
import { fetchLikeCounts, fetchMyCityIds } from '../cityActivity.js'
```

Replace the start of the component, from `export default function Destinations() {` through the end of the existing `useEffect(...)` block, with:

```jsx
export default function Destinations({ user }) {
  const [query, setQuery] = useState('')
  // Like counts for everyone; null until loaded (or if loading failed)
  const [counts, setCounts] = useState(null)
  const [visited, setVisited] = useState([])
  const userId = user?.id

  useEffect(() => {
    document.title = 'Destinations - Aaslema'
  }, [])

  useEffect(() => {
    fetchLikeCounts().then(setCounts)
    if (userId) fetchMyCityIds('city_visits').then(setVisited)
  }, [userId])
```

Replace the whole `{filtered.map((city) => ( ... ))}` card block with:

```jsx
              {filtered.map((city) => {
                const isVisited = visited.includes(city.id)
                const likes = likeCount(counts, city.id)
                return (
                  <a key={city.id} href={`${base}/destinations/${city.id}`} className={`guide-card ${isVisited ? 'guide-card--visited' : ''}`}>
                    <div className="guide-card__image">
                      <img src={city.image} alt={city.name} loading="lazy" />
                      {isVisited && <span className="guide-card__visited"><CheckCircle2 size={20} /> Visited</span>}
                    </div>
                    <div className="guide-card__head">
                      <div>
                        <h2>{city.name}</h2>
                        <p>{city.title}</p>
                      </div>
                      <span className={`guide-card__likes ${likes > 0 ? 'is-liked' : ''}`} title="Likes">
                        <Heart size={14} /> {counts && likes}
                      </span>
                    </div>
                    <div className="guide-card__chips">
                      <span className="chip">{city.vibe}</span>
                      <span className="chip"><Users size={12} /> {city.population}</span>
                    </div>
                  </a>
                )
              })}
```

(`{counts && likes}` renders nothing while counts are `null`; the visible "Visited" text is read by screen readers too.)

- [ ] **Step 3: Add the card styles**

In `frontend/src/styles.css`, change the `.guide-card__image { ... }` rule to add `position: relative;`:

```css
.guide-card__image { position: relative; aspect-ratio: 3 / 2; overflow: hidden; border-radius: 14px; background: var(--lighter); }
```

and directly after the `.guide-card:hover .guide-card__image img { ... }` line, add:

```css
/* Scaled up a little so the blur doesn't show soft edges inside the frame */
.guide-card--visited .guide-card__image img { filter: blur(3px) brightness(0.75); transform: scale(1.08); }
.guide-card--visited:hover .guide-card__image img { transform: scale(1.1); }
.guide-card__visited {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--white); font-size: 20px; font-weight: 700; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
}
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add src/cityActivity.js src/pages/Destinations.jsx src/styles.css
git commit -m "Show real like counts and visited destinations on the Destinations page"
```

---

### Task 4: Like and visit on the city page

**Files:**
- Modify: `frontend/src/pages/CityDetail.jsx`
- Modify: `frontend/src/App.jsx:41`
- Modify: `frontend/src/styles.css` (city hero rules ~line 465, mobile rule ~line 931)

**Interfaces:**
- Consumes: `likeCount`, `adjustCount` (Task 2); `fetchLikeCounts`, `fetchMyCityIds`, `setCityFlag` (Task 3); `user` prop (Supabase user or `null`).

- [ ] **Step 1: Pass `user` to the city page**

In `frontend/src/App.jsx`, change line 41 to:

```jsx
const Page = cityId ? (props) => <CityDetail id={cityId} {...props} /> : (inAdmin ? adminPages : inApp ? appPages : pages)[currentPath]
```

- [ ] **Step 2: Update imports and the top comment in `CityDetail.jsx`**

In `frontend/src/pages/CityDetail.jsx`, after `import { base } from '../route.js'` add:

```jsx
import { adjustCount, likeCount } from '../cityCounts.js'
import { fetchLikeCounts, fetchMyCityIds, setCityFlag } from '../cityActivity.js'
```

Replace the two comment lines above `const readList` with:

```jsx
// Port of aaslema-new's CityDetail page. Likes and visits live in Supabase (cityActivity.js);
// the plan and moments still live in the viewer's browser.
```

- [ ] **Step 3: Replace the like/visit state and add loading**

Change the signature to:

```jsx
export default function CityDetail({ id, user }) {
```

Replace these two lines:

```jsx
  const [hasLiked, setHasLiked] = useState(() => readList('liked_cities').includes(id))
```
```jsx
  const [isVisited, setIsVisited] = useState(() => readList('visited_cities').includes(id))
```

with (keep the `isInPlan` line between them as it is):

```jsx
  const [hasLiked, setHasLiked] = useState(false)
```
```jsx
  const [isVisited, setIsVisited] = useState(false)
  // Like counts for everyone; null until loaded (or if loading failed)
  const [counts, setCounts] = useState(null)
  const [likeBusy, setLikeBusy] = useState(false)
  const [visitBusy, setVisitBusy] = useState(false)
  // null, 'signin' or 'error' — shown under the buttons
  const [note, setNote] = useState(null)
  const userId = user?.id
```

Directly after the existing `useEffect(() => { document.title = ... }, [city])` block (still before `if (!city) {`), add:

```jsx
  useEffect(() => {
    fetchLikeCounts().then(setCounts)
    if (!userId) return
    fetchMyCityIds('city_likes').then((ids) => setHasLiked(ids.includes(id)))
    fetchMyCityIds('city_visits').then((ids) => setIsVisited(ids.includes(id)))
  }, [id, userId])
```

- [ ] **Step 4: Replace the like and visit handlers**

Delete these lines:

```jsx
  const likes = city.likes + (hasLiked ? 1 : 0)

  const handleLike = () => {
    writeList('liked_cities', toggleIn(readList('liked_cities'), city.id))
    setHasLiked(!hasLiked)
  }
```

and

```jsx
  const handleToggleVisited = () => {
    writeList('visited_cities', toggleIn(readList('visited_cities'), city.id))
    setIsVisited(!isVisited)
  }
```

and add in their place (before `const handleAddToPlan`):

```jsx
  // Flip right away, save, and flip back if saving fails
  const toggleFlag = async (table, isOn, setOn, setBusy, countsLikes) => {
    if (!user) return setNote('signin')
    setNote(null)
    setBusy(true)
    setOn(!isOn)
    if (countsLikes) setCounts((c) => c && adjustCount(c, city.id, isOn ? -1 : 1))
    const saved = await setCityFlag(table, city.id, !isOn)
    if (!saved) {
      setOn(isOn)
      if (countsLikes) setCounts((c) => c && adjustCount(c, city.id, isOn ? 1 : -1))
      setNote('error')
    }
    setBusy(false)
  }
  const handleLike = () => toggleFlag('city_likes', hasLiked, setHasLiked, setLikeBusy, true)
  const handleToggleVisited = () => toggleFlag('city_visits', isVisited, setIsVisited, setVisitBusy, false)
```

- [ ] **Step 5: Update the buttons, add the note and the hero label**

Replace the Like button with:

```jsx
                <button onClick={handleLike} disabled={likeBusy} aria-pressed={hasLiked} className={`city-btn ${hasLiked ? 'city-btn--primary' : ''}`}>
                  <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
                  {hasLiked ? 'Liked' : 'Like'}{counts && ` · ${likeCount(counts, city.id)}`}
                </button>
```

Add `disabled={visitBusy}` to the Mark as visited button (after `onClick={handleToggleVisited}`); leave its contents unchanged.

Directly after the closing `</div>` of `<div className="city-actions">`, add:

```jsx
              {note === 'signin' && (
                <p className="city-note">Sign in to like and track your visits. <a href="/signin">Sign in</a></p>
              )}
              {note === 'error' && <p className="city-note city-note--error" role="alert">Couldn't save that. Please try again.</p>}
```

Replace:

```jsx
            <img src={city.image} alt={city.name} className="city-hero__image" />
```

with:

```jsx
            <div className="city-hero__media">
              <img src={city.image} alt={city.name} className="city-hero__image" />
              {isVisited && <span className="city-hero__visited"><CheckCircle2 size={18} /> Visited</span>}
            </div>
```

- [ ] **Step 6: Add the styles**

In `frontend/src/styles.css`, directly after the `.city-hero__image { ... }` line, add:

```css
.city-hero__media { position: relative; }
.city-hero__visited {
  position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 999px;
  background: rgba(28, 35, 31, 0.75); color: var(--white); font-weight: 600;
}
.city-note { margin: 14px 0 0; font-size: 15px; }
.city-note a { color: var(--primary); font-weight: 600; }
.city-note--error { color: #e57373; }
```

and change the mobile rule `.city-hero__grid > img { order: -1; }` to:

```css
  .city-hero__grid > .city-hero__media { order: -1; }
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; `✓ built in`. Also confirm with a search that `liked_cities` and `visited_cities` no longer appear anywhere in `src/`:

Run: `grep -rn "liked_cities\|visited_cities" src/`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/pages/CityDetail.jsx src/App.jsx src/styles.css
git commit -m "Save destination likes and visits from the city page"
```

- [ ] **Step 9: Manual check (site owner, in the browser)**

After running `backend/supabase/004_city_likes_visits.sql` in the Supabase SQL Editor and rebuilding (`docker compose up -d --build`):

1. Signed out, `/destinations` shows counts (0 everywhere at first); on a city page, Like shows "Sign in to like and track your visits."
2. Signed in as user A, like Tozeur → "Liked · 1"; back on Destinations the Tozeur card shows 1.
3. Signed in as user B, like Tozeur → 2; unlike → 1.
4. As A, mark Tozeur visited → the button reads "Visited" and the hero image shows "✓ Visited"; on Destinations the Tozeur card is blurred with "✓ Visited". User B does not see it as visited.
5. Refresh, and sign in as A in another browser → likes and visits are still there.
6. With the network set to offline in dev tools, click Like → it flips back and shows "Couldn't save that. Please try again."
7. In the SQL Editor: `set role anon; select * from public.city_likes;` → "permission denied"; `select * from public.city_like_counts();` → counts; `reset role;`.
