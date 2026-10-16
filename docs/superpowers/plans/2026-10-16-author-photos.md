# Author Photos on Reviews and Moments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each author's current profile photo (or initials) and current name on landing page review cards and destination moment cards.

**Architecture:** `010_author_photos.sql` recreates `published_reviews()` and `published_moments(text)` with a `left join public.profiles`, returning the live name and `author_avatar` (photo path). The API modules turn the path into a public link with `avatarUrl`; review cards already render `avatar`, moment cards get a small photo/initials row.

**Tech Stack:** React 18 + Vite, Supabase (Postgres security-definer RPCs, public Storage bucket), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-author-photos-design.md`

## Global Constraints

- SQL file: `backend/supabase/010_author_photos.sql`, run after 006, 007, 008 and 009; safe to re-run; functions are dropped and recreated (return type changes).
- Name shown: `coalesce(profiles.full_name, <post>.author_name)`. Photo: `profiles.avatar_path` → `avatarUrl(path)`; `null` → initials.
- Only name and photo path leave the database: no user ids, phone, city or country.
- Before `010` is run, `author_avatar` is missing from rows; cards must show initials, not break.
- Scope: landing page reviews and destination moments only (no admin pages).
- Tests: Vitest, pure functions only; run from `frontend/`: `npx vitest run`.
- Style: 2-space indent, no semicolons, single quotes, short "why" comments.

## Review Focus

1. A moment card's small photo inherits `.moment-card img` (full width, 4:3) → it must stay a 28px circle. Pinned by the selector `.moment-card img.moment-card__avatar` in Task 3 and its browser check.
2. Rows from the old functions (before `010`) have no `author_avatar` → `avatarUrl(undefined)` returns `null` and cards show initials. Pinned by the `cardsFromReviews` "missing" test in Task 2.
3. A review/moment whose author has no profile row (deleted profile, or 009 trigger missed them) → saved `author_name` shown, initials. Pinned by the SQL `left join` + `coalesce` in Task 1 and manual check.
4. Moment likes (`likes`, `liked`, `mine`) must keep working after the function is recreated. Pinned by keeping those columns verbatim in Task 1 and the Task 3 browser check.
5. Signed-out visitors must still load both lists (grants to `anon`). Pinned by the `grant execute … to anon, authenticated` lines in Task 1 and the manual check.

---

### Task 1: SQL: live author name and photo in the published lists

**Files:**
- Create: `backend/supabase/010_author_photos.sql`

**Interfaces:**
- Produces: `published_reviews()` → `(id, author_name, author_avatar, travel_style, rating, body)`; `published_moments(p_city_id text)` → `(id, author_name, author_avatar, spot, caption, image_path, created_at, likes, liked, mine)`.

- [ ] **Step 1: Write the file**

Create `backend/supabase/010_author_photos.sql` with exactly the SQL block from the spec's "Database" section:

```sql
-- Author name and photo on published reviews and moments, read live from public.profiles.
-- Run after 006_reviews.sql, 007_moments.sql, 008_moment_likes.sql and 009_profiles.sql. Safe to re-run.

-- Approved reviews for the landing page, newest first, without user ids.
drop function if exists public.published_reviews();
create function public.published_reviews()
returns table (id uuid, author_name text, author_avatar text, travel_style text, rating smallint, body text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, coalesce(p.full_name, r.author_name), p.avatar_path, r.travel_style, r.rating, r.body
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.approved_at is not null
  order by r.approved_at desc
  limit 20
$$;

revoke all on function public.published_reviews() from public;
grant execute on function public.published_reviews() to anon, authenticated;

-- Approved moments of a destination with like counts, newest first, without user ids.
drop function if exists public.published_moments(text);
create function public.published_moments(p_city_id text)
returns table (id uuid, author_name text, author_avatar text, spot text, caption text, image_path text, created_at timestamptz, likes bigint, liked boolean, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, coalesce(p.full_name, m.author_name), p.avatar_path, m.spot, m.caption, m.image_path, m.created_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id),
    exists (select 1 from public.moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()),
    coalesce(m.user_id = auth.uid(), false)
  from public.moments m
  left join public.profiles p on p.id = m.user_id
  where m.city_id = p_city_id and m.approved_at is not null
  order by m.approved_at desc
  limit 50
$$;

revoke all on function public.published_moments(text) from public;
grant execute on function public.published_moments(text) to anon, authenticated;
```

- [ ] **Step 2: Check against the old functions**

Compare with `published_reviews` in `backend/supabase/006_reviews.sql` and `published_moments` in `backend/supabase/008_moment_likes.sql`: every old column, filter, order and limit is still there; only `author_name` (now `coalesce`), `author_avatar` and the `left join` are new. No database is available; the owner runs the file.

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/010_author_photos.sql
git commit -m "Author photos: live name and photo in published reviews and moments (010)"
```

---

### Task 2: Review cards show the author's photo

**Files:**
- Modify: `frontend/src/reviews.js` (`cardsFromReviews`)
- Modify: `frontend/src/reviewsApi.js`
- Test: `frontend/src/reviews.test.js` (`describe('cardsFromReviews')`)

**Interfaces:**
- Consumes: `avatarUrl(path) → string | null` from `frontend/src/profileApi.js`.
- Produces: rows from `fetchPublishedReviews()` carry `author_avatar_url: string | null`; `cardsFromReviews` maps it to `avatar`.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/reviews.test.js`, replace the whole `describe('cardsFromReviews', …)` block with:

```js
describe('cardsFromReviews', () => {
  it('turns published rows into slider cards with the author photo', () => {
    const row = { id: 'r1', author_name: 'Leila', travel_style: 'Bikepacker', rating: 4, body: 'Great.', author_avatar_url: 'https://x/a.jpg' }
    expect(cardsFromReviews([row])).toEqual([
      { key: 'r1', quote: 'Great.', name: 'Leila', role: 'Bikepacker', rating: 4, avatar: 'https://x/a.jpg' },
    ])
  })

  it('has no avatar when the author has no photo or the list predates 010', () => {
    const row = { id: 'r1', author_name: 'Leila', travel_style: 'Bikepacker', rating: 4, body: 'Great.' }
    expect(cardsFromReviews([row])[0].avatar).toBeNull()
    expect(cardsFromReviews([{ ...row, author_avatar_url: null }])[0].avatar).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify the first test fails**

Run (in `frontend/`): `npx vitest run src/reviews.test.js`
Expected: FAIL in "turns published rows into slider cards with the author photo" — `avatar` is `null`, expected `'https://x/a.jpg'`. The "has no avatar" test passes already (current code always gives `null`).

- [ ] **Step 3: Implement**

In `frontend/src/reviews.js`, replace `cardsFromReviews` with:

```js
// author_avatar_url is added by reviewsApi.js; missing until 010_author_photos.sql has been run
export const cardsFromReviews = (rows) =>
  rows.map((r) => ({ key: r.id, quote: r.body, name: r.author_name, role: r.travel_style, rating: r.rating, avatar: r.author_avatar_url ?? null }))
```

Replace `frontend/src/reviewsApi.js` with:

```js
import { supabase } from './supabase.js'
import { avatarUrl } from './profileApi.js'

// Approved reviews for the landing page; null if they couldn't be loaded. Never throws.
export async function fetchPublishedReviews() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('published_reviews')
    if (error) return null
    // author_avatar is the author's profile photo path (010_author_photos.sql)
    return (data ?? []).map((r) => ({ ...r, author_avatar_url: avatarUrl(r.author_avatar) }))
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run the suite**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all tests PASS (one more than before); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/reviews.js frontend/src/reviews.test.js frontend/src/reviewsApi.js
git commit -m "Author photos: review cards show the author's photo"
```

---

### Task 3: Moment cards show the author's photo; checkpoint

**Files:**
- Modify: `frontend/src/momentsApi.js` (`fetchPublishedMoments`)
- Modify: `frontend/src/components/MomentsCarousel.jsx` (name line)
- Modify: `frontend/src/styles.css` (after `.moment-card strong { … }`)
- Modify: `CHECKPOINT.md`

**Interfaces:**
- Consumes: `avatarUrl` from `profileApi.js`; `initials` from `names.js`.
- Produces: moment objects carry `author_avatar_url: string | null`.

No pure function changes here (one field added in an API mapper, plus markup), so there is no new unit test; the build and the browser check cover it.

- [ ] **Step 1: Add the photo link**

In `frontend/src/momentsApi.js`, add `import { avatarUrl } from './profileApi.js'` after the `imageResize.js` import. In `fetchPublishedMoments`, replace the comment and `.map(...)` line:

```js
    // likes / liked / mine come from 008_moment_likes.sql, author_avatar from 010_author_photos.sql
    return rows
      .filter((r) => urls[r.image_path])
      .map((r) => ({
        ...r, url: urls[r.image_path], likes: Number(r.likes ?? 0), liked: Boolean(r.liked), mine: Boolean(r.mine),
        author_avatar_url: avatarUrl(r.author_avatar),
      }))
```

- [ ] **Step 2: Photo or initials next to the name**

In `frontend/src/components/MomentsCarousel.jsx`, add `import { initials } from '../names.js'` with the other imports, and replace `<strong>{m.author_name}</strong>` with:

```jsx
                  <div className="moment-card__by">
                    {m.author_avatar_url
                      ? <img src={m.author_avatar_url} alt="" className="moment-card__avatar" draggable="false" />
                      : <span className="moment-card__avatar moment-card__avatar--initials" aria-hidden="true">{initials(m.author_name)}</span>}
                    <strong>{m.author_name}</strong>
                  </div>
```

- [ ] **Step 3: Styles**

In `frontend/src/styles.css`, after the line `.moment-card strong { color: var(--title); overflow-wrap: anywhere; }`, add:

```css
.moment-card__by { display: flex; align-items: center; gap: 8px; min-width: 0; }
/* Beats `.moment-card img` (full-width 4:3 photo) */
.moment-card img.moment-card__avatar, .moment-card__avatar { width: 28px; height: 28px; aspect-ratio: auto; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
.moment-card__avatar--initials { display: grid; place-items: center; background: var(--primary); color: var(--white); font-size: 12px; font-weight: 700; }
```

- [ ] **Step 4: Verify**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all PASS; build succeeds.

- [ ] **Step 5: Browser check (or list for the owner)**

With `010` applied, on a destination's Moments tab: a 28px round photo (or initials) sits left of the name; the big moment photo is unchanged; likes still work signed in; the tab loads signed out. Landing page slider shows photos for authors who have one.

- [ ] **Step 6: Update the checkpoint**

In `CHECKPOINT.md`:
- "Last updated" → today and the last commit hash.
- State: test count; SQL list `001`–`010`; add `010_author_photos.sql` to the "have been applied" list.
- Waiting on you: run `010_author_photos.sql` (after 009); the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-author-photos-design.md`.
- Done table: row "Author photos and live names on landing page reviews and destination moments (`010_author_photos.sql`)" | `2026-10-16-author-photos` | first – last commit.
- Next item 3 (Profile): drop "public name + photo for … reviews / moments" (keep Feed).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/momentsApi.js frontend/src/components/MomentsCarousel.jsx frontend/src/styles.css CHECKPOINT.md
git commit -m "Author photos: moment cards show the author's photo"
```
