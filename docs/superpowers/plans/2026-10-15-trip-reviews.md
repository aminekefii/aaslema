# Rate Your Trip Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users leave one review (stars, travel style, text) from a "Rate Your Trip" page; admins approve, unpublish or delete reviews on a new admin Reviews page; approved reviews replace the samples in the landing page's "What Our Users Say" slider.

**Architecture:** A `public.reviews` table with row level security, column grants and a `before update` trigger (content changes reset approval; only admins change `approved_at`), plus a `security definer` function `published_reviews()` for the public. Pure, tested helpers (`names.js`, `reviews.js`, `adminReviews.js`) hold all logic; pages call Supabase directly like the Messages page does.

**Tech Stack:** React 18, Vite 5, Supabase JS v2, Postgres (Supabase RLS + plpgsql trigger), lucide-react, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-10-15-trip-reviews-design.md`

## Global Constraints

- Frontend commands run from `frontend/`; SQL lives in `backend/supabase/`.
- Link label "Rate Your Trip", page `/app/review`, in `appNavLinks` between Community and Contact; public `navLinks` unchanged.
- Travel styles, exactly: `Backpacker`, `Bikepacker`, `History Traveler`, `Solo Traveler`, `Other`.
- Limits: rating integer 1–5; body 10–1000 characters after trimming; author name ≤ 100 characters. Character counts are code points (Postgres `char_length`), not UTF-16 length.
- Landing page shows at most 20 approved reviews, newest approval first; the 4 samples in `data.js` show when there are none, while loading, or on error.
- No browser dialogs (`alert`/`confirm`): Delete confirms in the page.
- Commit messages follow the repo style: short, plain-English, capitalised, no prefix.

## Review Focus

- A review typed with emoji must be judged by the same length rules the database uses (code points), or the form accepts text the database then rejects → pinned in Task 3 (`counts an emoji as one character`).
- Saving an edit that changes nothing keeps the review published; the page must say it is still on the site, not "will appear once an admin approves it" → pinned in Task 3 (`savedMessage`).
- Account names with extra spaces or a leading emoji must still give clean initials on the card → pinned in Task 2.
- No approved reviews, or a failed load, must show the samples, never an empty slider → pinned in Task 3 (`slideCards`).
- A very long review or an unbroken word (a pasted URL) must not overflow the slider card → `overflow-wrap: anywhere` in Task 5, checked by hand in Task 5 Step 5.

---

### Task 1: Reviews table and public function in Supabase

**Files:**
- Create: `backend/supabase/006_reviews.sql`
- Modify: `backend/README.md` (Supabase SQL list)

**Interfaces:**
- Produces: table `public.reviews (id uuid, user_id uuid unique, author_name text, travel_style text, rating smallint, body text, created_at, updated_at, approved_at timestamptz null)`; RPC `published_reviews()` → rows `{ id, author_name, travel_style, rating, body }`.

- [ ] **Step 1: Write the SQL file**

`backend/supabase/006_reviews.sql`:

```sql
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
```

- [ ] **Step 2: Add the file to the README list**

In `backend/README.md`, after the line starting `5. \`005_city_visit_counts.sql\``, add:

```markdown
6. `006_reviews.sql` — Rate Your Trip reviews; admins approve them before they show on the landing page
```

- [ ] **Step 3: Check by reading**

Read the SQL once against the spec's Database section (it must match exactly). There is no local Postgres; the owner runs it in the Supabase SQL Editor.

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/006_reviews.sql backend/README.md
git commit -m "Add Supabase table and access rules for trip reviews"
```

---

### Task 2: Shared name helpers

**Files:**
- Create: `frontend/src/names.js`
- Test: `frontend/src/names.test.js`
- Modify: `frontend/src/sections/AppHeader.jsx` (remove the local `initials`, import it)

**Interfaces:**
- Produces: `displayName(user) → string` (trimmed `user_metadata.full_name`, else email before `@`, else `''`); `initials(name: string) → string`.

- [ ] **Step 1: Write the failing test**

`frontend/src/names.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { displayName, initials } from './names.js'

describe('displayName', () => {
  it('uses the full name, trimmed', () => {
    expect(displayName({ email: 'leila@x.com', user_metadata: { full_name: '  Leila Ben Ali ' } })).toBe('Leila Ben Ali')
  })

  it('falls back to the email before @ when the full name is missing or blank', () => {
    expect(displayName({ email: 'tom.r@x.com', user_metadata: {} })).toBe('tom.r')
    expect(displayName({ email: 'tom.r@x.com', user_metadata: { full_name: '   ' } })).toBe('tom.r')
    expect(displayName({ email: 'tom.r@x.com' })).toBe('tom.r')
  })
})

describe('initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initials('Leila Ben Ali')).toBe('LB')
    expect(initials('tom@x.com')).toBe('T')
  })

  it('ignores extra spaces', () => {
    expect(initials('  leila   ben ')).toBe('LB')
  })

  it('keeps an emoji whole', () => {
    expect(initials('😀 Sam')).toBe('😀S')
  })

  it('is empty for an empty name', () => {
    expect(initials('')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/names.test.js`
Expected: FAIL — cannot resolve `./names.js`.

- [ ] **Step 3: Write the implementation**

`frontend/src/names.js`:

```js
// Names shown for an account: the navbar avatar and review cards.

export function displayName(user) {
  const full = user?.user_metadata?.full_name?.trim()
  return full || (user?.email ?? '').split('@')[0]
}

// "Leila Ben Ali" -> "LB", "tom@x.com" -> "T"; Array.from keeps an emoji whole
export const initials = (name) =>
  name.trim().split(/\s+/).map((w) => Array.from(w)[0] ?? '').slice(0, 2).join('').toUpperCase()
```

In `frontend/src/sections/AppHeader.jsx`, delete these two lines:

```js
// "Leila Ben Ali" -> "LB", "tom@x.com" -> "T"
const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
```

and add after `import { isAdmin } from '../roles.js'`:

```js
import { initials } from '../names.js'
```

(The navbar's shown name stays `user.user_metadata?.full_name || user.email`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all test files PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/names.js frontend/src/names.test.js frontend/src/sections/AppHeader.jsx
git commit -m "Move account name and initials helpers into names.js"
```

---

### Task 3: Review form rules and card helpers

**Files:**
- Create: `frontend/src/reviews.js`
- Test: `frontend/src/reviews.test.js`

**Interfaces:**
- Consumes: `displayName(user)` from `names.js` (Task 2).
- Produces:
  - `travelStyles: string[]`, `BODY_MAX = 1000`, `textLength(s) → number` (code points)
  - `reviewFromForm({ rating: number, travelStyle: string, body: string }, user) → { error: string } | { row: { author_name, travel_style, rating, body } }`
  - `savedMessage(row) → string`
  - `cardsFromReviews(rows) → [{ key, quote, name, role, rating, avatar: null }]`
  - `slideCards(published: rows | null, samples) → cards`

- [ ] **Step 1: Write the failing test**

`frontend/src/reviews.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { cardsFromReviews, reviewFromForm, savedMessage, slideCards, textLength, travelStyles } from './reviews.js'

const user = { email: 'leila@x.com', user_metadata: { full_name: 'Leila Ben Ali' } }
const valid = { rating: 4, travelStyle: 'Bikepacker', body: 'Great roads and kind people.' }

describe('reviewFromForm', () => {
  it('returns the row to save', () => {
    expect(reviewFromForm(valid, user)).toEqual({
      row: { author_name: 'Leila Ben Ali', travel_style: 'Bikepacker', rating: 4, body: 'Great roads and kind people.' },
    })
  })

  it.each([0, 6, 2.5, '4', undefined])('rejects rating %s', (rating) => {
    expect(reviewFromForm({ ...valid, rating }, user)).toEqual({ error: 'Please choose a star rating.' })
  })

  it.each([1, 5])('accepts rating %s', (rating) => {
    expect(reviewFromForm({ ...valid, rating }, user).row.rating).toBe(rating)
  })

  it('accepts every travel style', () => {
    for (const travelStyle of travelStyles) expect(reviewFromForm({ ...valid, travelStyle }, user).row.travel_style).toBe(travelStyle)
  })

  it.each(['', 'Tourist', 'bikepacker'])('rejects travel style "%s"', (travelStyle) => {
    expect(reviewFromForm({ ...valid, travelStyle }, user)).toEqual({ error: 'Please choose your travel style.' })
  })

  it('trims the review', () => {
    expect(reviewFromForm({ ...valid, body: '  Lovely trip!\n' }, user).row.body).toBe('Lovely trip!')
  })

  it('needs at least 10 characters after trimming', () => {
    expect(reviewFromForm({ ...valid, body: '   123456789   ' }, user)).toEqual({ error: 'Please write at least 10 characters.' })
    expect(reviewFromForm({ ...valid, body: undefined }, user)).toEqual({ error: 'Please write at least 10 characters.' })
    expect(reviewFromForm({ ...valid, body: '1234567890' }, user).row.body).toBe('1234567890')
  })

  it('allows up to 1000 characters', () => {
    expect(reviewFromForm({ ...valid, body: 'a'.repeat(1000) }, user).row.body).toHaveLength(1000)
    expect(reviewFromForm({ ...valid, body: 'a'.repeat(1001) }, user)).toEqual({ error: 'Your review is too long (1000 characters max).' })
  })

  it('counts an emoji as one character, like the database', () => {
    expect(reviewFromForm({ ...valid, body: '😀'.repeat(9) }, user)).toEqual({ error: 'Please write at least 10 characters.' })
    expect(reviewFromForm({ ...valid, body: '😀'.repeat(1000) }, user).row).toBeDefined()
    expect(textLength('😀😀')).toBe(2)
  })

  it('checks the rating first', () => {
    expect(reviewFromForm({ rating: 0, travelStyle: '', body: '' }, user)).toEqual({ error: 'Please choose a star rating.' })
  })

  it('uses the email before @ without a full name', () => {
    expect(reviewFromForm(valid, { email: 'tom.r@x.com', user_metadata: {} }).row.author_name).toBe('tom.r')
  })

  it('cuts the name at 100 characters', () => {
    const long = { email: 'x@x.com', user_metadata: { full_name: 'é'.repeat(120) } }
    expect(textLength(reviewFromForm(valid, long).row.author_name)).toBe(100)
  })
})

describe('savedMessage', () => {
  it('says a pending review waits for an admin', () => {
    expect(savedMessage({ approved_at: null })).toBe('Thanks! Your review will appear on the site once an admin approves it.')
  })

  it('says an unchanged published review is still on the site', () => {
    expect(savedMessage({ approved_at: '2026-10-15T10:00:00Z' })).toBe('Saved. Your review is still on the site.')
  })
})

describe('cardsFromReviews', () => {
  it('turns published rows into slider cards', () => {
    expect(cardsFromReviews([{ id: 'r1', author_name: 'Leila', travel_style: 'Bikepacker', rating: 4, body: 'Great.' }])).toEqual([
      { key: 'r1', quote: 'Great.', name: 'Leila', role: 'Bikepacker', rating: 4, avatar: null },
    ])
  })
})

describe('slideCards', () => {
  const samples = [{ name: 'Sample' }]
  const rows = [{ id: 'r1', author_name: 'Leila', travel_style: 'Other', rating: 5, body: 'Great trip.' }]

  it('shows the samples while loading, on error or with no published reviews', () => {
    expect(slideCards(null, samples)).toBe(samples)
    expect(slideCards([], samples)).toBe(samples)
  })

  it('shows only published reviews when there are some', () => {
    expect(slideCards(rows, samples)).toEqual(cardsFromReviews(rows))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/reviews.test.js`
Expected: FAIL — cannot resolve `./reviews.js`.

- [ ] **Step 3: Write the implementation**

`frontend/src/reviews.js`:

```js
import { displayName } from './names.js'

// Rate Your Trip reviews: form rules (matching the database limits) and landing page cards.

export const travelStyles = ['Backpacker', 'Bikepacker', 'History Traveler', 'Solo Traveler', 'Other']
export const BODY_MAX = 1000
const BODY_MIN = 10
const NAME_MAX = 100

// Postgres counts characters, not UTF-16 units, so an emoji is one
export const textLength = (s) => Array.from(s).length

export function reviewFromForm({ rating, travelStyle, body }, user) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Please choose a star rating.' }
  if (!travelStyles.includes(travelStyle)) return { error: 'Please choose your travel style.' }
  const text = (body ?? '').trim()
  if (textLength(text) < BODY_MIN) return { error: 'Please write at least 10 characters.' }
  if (textLength(text) > BODY_MAX) return { error: 'Your review is too long (1000 characters max).' }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { author_name: name, travel_style: travelStyle, rating, body: text } }
}

// Saving with no change leaves an approved review published
export const savedMessage = (row) =>
  row.approved_at ? 'Saved. Your review is still on the site.' : 'Thanks! Your review will appear on the site once an admin approves it.'

export const cardsFromReviews = (rows) =>
  rows.map((r) => ({ key: r.id, quote: r.body, name: r.author_name, role: r.travel_style, rating: r.rating, avatar: null }))

// The samples fill the slider until the first review is approved (and if loading fails)
export const slideCards = (published, samples) => (published?.length ? cardsFromReviews(published) : samples)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/reviews.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/reviews.js frontend/src/reviews.test.js
git commit -m "Add review form rules and landing card helpers"
```

---

### Task 4: Rate Your Trip page

**Files:**
- Create: `frontend/src/pages/Review.jsx`
- Modify: `frontend/src/redirects.js:5` (`appPagePaths`), `frontend/src/redirects.test.js` (new describe at the end), `frontend/src/data.js:25-32` (`appNavLinks`), `frontend/src/App.jsx` (import + `appPages`), `frontend/src/styles.css` (after the `.contact__hp` rule)

**Interfaces:**
- Consumes: `travelStyles`, `BODY_MAX`, `textLength`, `reviewFromForm`, `savedMessage` from `reviews.js` (Task 3); table `reviews` (Task 1).
- Produces: default export `Review({ user })`; route `/app/review`.

- [ ] **Step 1: Write the failing redirect test**

Append to `frontend/src/redirects.test.js`:

```js
describe('redirectFor and /app/review', () => {
  it('is an app page', () => {
    expect(appPagePaths).toContain('/app/review')
  })

  it('is for signed-in users only', () => {
    expect(redirectFor('/app/review', true)).toBe(null)
    expect(redirectFor('/app/review', false)).toBe('/signin')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/redirects.test.js`
Expected: FAIL — `appPagePaths` does not contain `/app/review`.

- [ ] **Step 3: Add the route, the link and the page**

In `frontend/src/redirects.js`, the `appPagePaths` line becomes:

```js
export const appPagePaths = ['/app', '/app/destinations', '/app/festivals', '/app/community', '/app/review', '/app/contact', '/app/planner', '/app/profile']
```

In `frontend/src/data.js`, `appNavLinks` becomes:

```js
export const appNavLinks = [
  ['Home', '/app'],
  ['Destinations', '/app/destinations'],
  ['Festivals', '/app/festivals'],
  ['Community', '/app/community'],
  ['Rate Your Trip', '/app/review'],
  ['Contact', '/app/contact'],
  ['AI Planner', '/app/planner'],
]
```

In `frontend/src/App.jsx`, add after `import Profile from './pages/Profile.jsx'`:

```js
import Review from './pages/Review.jsx'
```

and the `appPages` line becomes:

```js
const appPages = { '/app': AppHome, '/app/destinations': Destinations, '/app/festivals': Festivals, '/app/community': Community, '/app/review': Review, '/app/contact': Contact, '/app/planner': Planner, '/app/profile': Profile }
```

`frontend/src/pages/Review.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Send, Star } from 'lucide-react'
import { supabase } from '../supabase.js'
import { BODY_MAX, reviewFromForm, savedMessage, textLength, travelStyles } from '../reviews.js'

const saveFailed = "Couldn't save your review. Please try again."

export default function Review({ user }) {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [review, setReview] = useState(null) // the saved review, null if none yet
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [travelStyle, setTravelStyle] = useState('')
  const [body, setBody] = useState('')
  // null, 'saving', { done } or { error }
  const [status, setStatus] = useState(null)

  const fill = (row) => {
    setReview(row)
    if (!row) return
    setRating(row.rating)
    setTravelStyle(row.travel_style)
    setBody(row.body)
  }

  const load = async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('reviews').select('*').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      fill(data)
    } catch {
      setLoadFailed(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    document.title = 'Rate Your Trip - Aaslema'
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const result = reviewFromForm({ rating, travelStyle, body }, user)
    if (result.error) return setStatus({ error: result.error })

    setStatus('saving')
    try {
      const query = review
        ? supabase.from('reviews').update(result.row).eq('id', review.id)
        : supabase.from('reviews').insert(result.row)
      const { data, error } = await query.select().single()
      // Saved from another tab in the meantime: show that one
      if (error?.code === '23505') {
        await load()
        return setStatus({ done: "You already have a review; it's shown below." })
      }
      if (error) throw error
      fill(data)
      setStatus({ done: savedMessage(data) })
    } catch {
      setStatus({ error: saveFailed })
    }
  }

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Rate Your Trip</h1>
          <p>Tell other travellers how your trip went.</p>
        </div>
      </section>

      <section className="section">
        <div className="container review-page">
          {loading ? (
            <p className="review-page__note">Loading your review…</p>
          ) : loadFailed ? (
            <p className="review-page__note contact__error">
              Couldn't load your review.{' '}
              <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
            </p>
          ) : (
            <form className="contact__form" onSubmit={submit} noValidate>
              <h2>{review ? 'Your review' : 'Leave a review'}</h2>
              {review && (
                <p className={`review-form__status ${review.approved_at ? 'review-form__status--live' : ''}`}>
                  {review.approved_at ? 'Published on the site' : 'Waiting for approval'}
                </p>
              )}
              <fieldset className="contact__fieldset" disabled={status === 'saving'}>
                <div className="review-form__stars" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                      className={n <= (hover || rating) ? 'on' : ''}
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                    >
                      <Star size={30} fill="currentColor" />
                    </button>
                  ))}
                </div>
                <label>
                  Travel style
                  <select value={travelStyle} onChange={(e) => setTravelStyle(e.target.value)}>
                    <option value="" disabled>Choose your travel style</option>
                    {travelStyles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label>
                  Your review
                  <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
                  <span className="review-form__count">{textLength(body.trim())} / {BODY_MAX}</span>
                </label>
                <button type="submit" className="btn btn--primary">
                  {status === 'saving' ? 'Saving…' : <>{review ? 'Update review' : 'Submit review'} <Send size={16} /></>}
                </button>
                {review?.approved_at && <p className="review-form__hint">Changing your review sends it back for approval.</p>}
              </fieldset>
              {status?.done && <p className="contact__sent" role="status">{status.done}</p>}
              {status?.error && <p className="contact__error" role="alert">{status.error}</p>}
            </form>
          )}
        </div>
      </section>
    </>
  )
}
```

In `frontend/src/styles.css`, change the selectors of the two contact input rules so selects match inputs:

```css
.contact__form input, .contact__form textarea, .contact__form select {
```

```css
.contact__form input:focus, .contact__form textarea:focus, .contact__form select:focus { border-color: var(--primary); }
```

and add after the `.contact__hp` rule:

```css
/* ---------- Rate Your Trip ---------- */
.review-page { max-width: 720px; }
.review-page__note { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin: 0; }
.review-form__status { margin: 0; justify-self: start; padding: 2px 12px; border-radius: 999px; font-size: 14px; font-weight: 500; background: rgba(247, 146, 30, 0.12); color: var(--secondary); }
.review-form__status--live { background: var(--tint); color: var(--primary-dark); }
.review-form__stars { display: flex; gap: 4px; }
.review-form__stars button { padding: 2px; border: 0; background: none; color: var(--border); cursor: pointer; }
.review-form__stars button.on { color: #fbbf24; }
.review-form__stars button:focus-visible { outline: 2px solid var(--primary); border-radius: 6px; }
.review-form__count { justify-self: end; font-size: 13px; font-weight: 400; color: var(--text); }
.review-form__hint { margin: 0; font-size: 14px; }
```

- [ ] **Step 4: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Review.jsx frontend/src/redirects.js frontend/src/redirects.test.js frontend/src/data.js frontend/src/App.jsx frontend/src/styles.css
git commit -m "Add Rate Your Trip page and navbar link"
```

---

### Task 5: Approved reviews in the landing page slider

**Files:**
- Create: `frontend/src/reviewsApi.js`
- Modify: `frontend/src/sections/Testimonials.jsx`, `frontend/src/styles.css` (reviews block, around `.review figcaption`)

**Interfaces:**
- Consumes: `slideCards` (Task 3), `initials` (Task 2), RPC `published_reviews` (Task 1).
- Produces: `fetchPublishedReviews() → Promise<rows[] | null>` (never throws).

- [ ] **Step 1: Write the API helper**

`frontend/src/reviewsApi.js`:

```js
import { supabase } from './supabase.js'

// Approved reviews for the landing page; null if they couldn't be loaded. Never throws.
export async function fetchPublishedReviews() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('published_reviews')
    return error ? null : (data ?? [])
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Use it in the slider**

In `frontend/src/sections/Testimonials.jsx`, the imports become:

```js
import { useEffect, useRef, useState } from 'react'
import { Quote } from 'lucide-react'
import Stars from '../components/Stars.jsx'
import { testimonials } from '../data.js'
import { initials } from '../names.js'
import { slideCards } from '../reviews.js'
import { fetchPublishedReviews } from '../reviewsApi.js'
```

At the top of `Testimonials()`, replace

```js
  const perView = usePerView()
  const positions = Math.max(1, testimonials.length - perView + 1)
```

with

```js
  const perView = usePerView()
  const [published, setPublished] = useState(null) // null until loaded, or if loading failed
  const cards = slideCards(published, testimonials)
  const positions = Math.max(1, cards.length - perView + 1)
```

and add after the `const dragStart = useRef(null)` line:

```js
  useEffect(() => {
    fetchPublishedReviews().then(setPublished)
  }, [])
```

Replace the card loop

```jsx
            {testimonials.map((t) => (
              <figure key={t.name} className="review" style={{ flexBasis: `${100 / perView}%` }}>
                <div className="review__bubble">
                  <Quote size={40} className="review__quote" />
                  <blockquote>“ {t.quote} ”</blockquote>
                  <Stars />
                </div>
                <figcaption>
                  <img src={t.avatar} alt={t.name} draggable="false" />
```

with

```jsx
            {cards.map((t) => (
              <figure key={t.key ?? t.name} className="review" style={{ flexBasis: `${100 / perView}%` }}>
                <div className="review__bubble">
                  <Quote size={40} className="review__quote" />
                  <blockquote>“ {t.quote} ”</blockquote>
                  <Stars count={t.rating ?? 5} />
                </div>
                <figcaption>
                  {t.avatar
                    ? <img src={t.avatar} alt={t.name} draggable="false" />
                    : <span className="review__initials" aria-hidden="true">{initials(t.name)}</span>}
```

(The rest of the figcaption, `<strong>{t.name}</strong>` and `<span>{t.role}</span>`, stays.)

- [ ] **Step 3: Style the initials circle and long text**

In `frontend/src/styles.css`, change

```css
.review blockquote { margin: 6px 0 12px; font-size: 16px; }
```

to

```css
.review blockquote { margin: 6px 0 12px; font-size: 16px; overflow-wrap: anywhere; }
```

and add after the `.review figcaption span { font-size: 14px; }` rule:

```css
.review figcaption .review__initials {
  display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: var(--primary); color: var(--white); font-size: 20px; font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 4: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 5: Check the slider by hand**

Run `npm run dev`, open `/` signed out. Before `006_reviews.sql` is run the RPC fails, so the 4 samples must show exactly as before (photos, 5 stars). After it is run and a review approved (Task 7), the slider shows the initials circle and the review's star count; a 1000-character review or a long URL stays inside its bubble.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/reviewsApi.js frontend/src/sections/Testimonials.jsx frontend/src/styles.css
git commit -m "Show approved reviews in the landing page slider"
```

---

### Task 6: Admin review helpers

**Files:**
- Create: `frontend/src/adminReviews.js`
- Test: `frontend/src/adminReviews.test.js`

**Interfaces:**
- Produces: `isPublished(r) → boolean`; `filterReviews(reviews, tab: 'pending' | 'published' | 'all') → reviews`; `reviewCounts(reviews) → { pending, published, all }`.

- [ ] **Step 1: Write the failing test**

`frontend/src/adminReviews.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { filterReviews, isPublished, reviewCounts } from './adminReviews.js'

const pending = { id: 'a', approved_at: null }
const published = { id: 'b', approved_at: '2026-10-15T10:00:00Z' }
const reviews = [pending, published, { id: 'c', approved_at: null }]

describe('isPublished', () => {
  it('is true only with an approval date', () => {
    expect(isPublished(published)).toBe(true)
    expect(isPublished(pending)).toBe(false)
  })
})

describe('filterReviews', () => {
  it('keeps pending, published or all reviews, in order', () => {
    expect(filterReviews(reviews, 'pending').map((r) => r.id)).toEqual(['a', 'c'])
    expect(filterReviews(reviews, 'published').map((r) => r.id)).toEqual(['b'])
    expect(filterReviews(reviews, 'all')).toBe(reviews)
  })
})

describe('reviewCounts', () => {
  it('counts each tab', () => {
    expect(reviewCounts(reviews)).toEqual({ pending: 2, published: 1, all: 3 })
    expect(reviewCounts([])).toEqual({ pending: 0, published: 0, all: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adminReviews.test.js`
Expected: FAIL — cannot resolve `./adminReviews.js`.

- [ ] **Step 3: Write the implementation**

`frontend/src/adminReviews.js`:

```js
// Admin Reviews page: which tab a review belongs to and how many each tab has.

export const isPublished = (r) => Boolean(r.approved_at)

export function filterReviews(reviews, tab) {
  if (tab === 'pending') return reviews.filter((r) => !isPublished(r))
  if (tab === 'published') return reviews.filter(isPublished)
  return reviews
}

export function reviewCounts(reviews) {
  const published = reviews.filter(isPublished).length
  return { pending: reviews.length - published, published, all: reviews.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adminReviews.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/adminReviews.js frontend/src/adminReviews.test.js
git commit -m "Add admin review filtering and counts"
```

---

### Task 7: Admin Reviews page and pending count

**Files:**
- Create: `frontend/src/pages/admin/AdminReviews.jsx`
- Modify: `frontend/src/redirects.js:7` (`adminPagePaths`), `frontend/src/redirects.test.js` (new describe at the end), `frontend/src/data.js:35-38` (`adminNavLinks`), `frontend/src/App.jsx` (import + `adminPages`), `frontend/src/sections/AdminLayout.jsx`, `frontend/src/styles.css` (after `.admin-btn-outline:disabled`)

**Interfaces:**
- Consumes: `isPublished`, `filterReviews`, `reviewCounts` (Task 6); `lastSeen(iso)` from `adminUsers.js`; `Stars({ count })`; table `reviews` (Task 1).
- Produces: default export `AdminReviews()`; route `/admin/reviews`; window event `admin:reviews-changed`.

- [ ] **Step 1: Write the failing redirect test**

Append to `frontend/src/redirects.test.js`:

```js
describe('redirectFor and /admin/reviews', () => {
  it('is an admin page', () => {
    expect(adminPagePaths).toContain('/admin/reviews')
  })

  it('is for admins only', () => {
    expect(redirectFor('/admin/reviews', true, true)).toBe(null)
    expect(redirectFor('/admin/reviews', true, false)).toBe('/app')
    expect(redirectFor('/admin/reviews', false)).toBe('/signin')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/redirects.test.js`
Expected: FAIL — `adminPagePaths` does not contain `/admin/reviews`.

- [ ] **Step 3: Add the route, link and sidebar count**

In `frontend/src/redirects.js`:

```js
export const adminPagePaths = ['/admin', '/admin/messages', '/admin/reviews']
```

In `frontend/src/data.js`:

```js
export const adminNavLinks = [
  ['Users', '/admin'],
  ['Messages', '/admin/messages'],
  ['Reviews', '/admin/reviews'],
]
```

In `frontend/src/App.jsx`, add after `import AdminMessages from './pages/admin/AdminMessages.jsx'`:

```js
import AdminReviews from './pages/admin/AdminReviews.jsx'
```

and the `adminPages` line becomes:

```js
const adminPages = { '/admin': AdminUsers, '/admin/messages': AdminMessages, '/admin/reviews': AdminReviews }
```

In `frontend/src/sections/AdminLayout.jsx`:
- The lucide import becomes `import { Compass, ExternalLink, LogOut, Mail, Menu, Star, Users, X } from 'lucide-react'`.
- `const icons = { '/admin': Users, '/admin/messages': Mail }` becomes `const icons = { '/admin': Users, '/admin/messages': Mail, '/admin/reviews': Star }`.
- Replace the whole `useNewMessageCount` function (comment included) with:

```js
// Rows still waiting for an admin (column is null); reloads when a page fires the event
function useAdminCount(table, column, event) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let latest = 0
    const load = async () => {
      const request = ++latest
      try {
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .is(column, null)
        // Two quick changes can answer out of order; keep only the newest answer
        if (!error && request === latest) setCount(count ?? 0)
      } catch {
        // No badge if the count can't be loaded
      }
    }
    load()
    window.addEventListener(event, load)
    return () => window.removeEventListener(event, load)
  }, [table, column, event])

  return count
}
```

- In `AdminLayout`, replace `const newMessages = useNewMessageCount()` with:

```js
  const badges = {
    '/admin/messages': useAdminCount('contact_messages', 'handled_at', 'admin:messages-changed'),
    '/admin/reviews': useAdminCount('reviews', 'approved_at', 'admin:reviews-changed'),
  }
```

- Replace the badge line

```jsx
                {href === '/admin/messages' && newMessages > 0 && <span className="admin-nav__count">{newMessages}</span>}
```

with

```jsx
                {badges[href] > 0 && <span className="admin-nav__count">{badges[href]}</span>}
```

- [ ] **Step 4: Write the page**

`frontend/src/pages/admin/AdminReviews.jsx`:

```jsx
import { useEffect, useState } from 'react'
import Stars from '../../components/Stars.jsx'
import { supabase } from '../../supabase.js'
import { lastSeen } from '../../adminUsers.js'
import { filterReviews, isPublished, reviewCounts } from '../../adminReviews.js'

const tabs = [['pending', 'Pending'], ['published', 'Published'], ['all', 'All']]

// Tells the sidebar to refresh its pending-review count
const notifyChanged = () => window.dispatchEvent(new Event('admin:reviews-changed'))

export default function AdminReviews() {
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pending')

  const load = async () => {
    setError(null)
    setReviews(null)
    try {
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
      if (error) setError(error)
      else setReviews(data ?? [])
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Reviews - Aaslema Admin'
    load()
  }, [])

  const replace = (updated) => setReviews((list) => list.map((r) => (r.id === updated.id ? updated : r)))
  const remove = (id) => setReviews((list) => list.filter((r) => r.id !== id))

  if (error) {
    return (
      <>
        <h1>Reviews</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load reviews: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (reviews === null) {
    return <><h1>Reviews</h1><p className="admin-note">Loading reviews…</p></>
  }

  const counts = reviewCounts(reviews)
  const shown = filterReviews(reviews, tab)

  return (
    <>
      <h1>Reviews</h1>
      <div className="admin-tabs" role="tablist" aria-label="Filter reviews">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="admin-note">{tab === 'pending' ? 'No reviews waiting for approval.' : 'No reviews here.'}</p>
      ) : (
        <ul className="admin-msgs">
          {shown.map((r) => <ReviewItem key={r.id} review={r} onChange={replace} onRemove={remove} />)}
        </ul>
      )}
    </>
  )
}

function ReviewItem({ review, onChange, onRemove }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const published = isPublished(review)

  const act = async (action) => {
    setBusy(true)
    setFailed(false)
    try {
      await action()
      notifyChanged()
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  // .single() errors when no row matched (deleted meanwhile, or no admin rights)
  const toggle = () => act(async () => {
    const approved_at = published ? null : new Date().toISOString()
    const { data, error } = await supabase.from('reviews').update({ approved_at }).eq('id', review.id).select().single()
    if (error) throw error
    onChange(data)
  })

  // A delete that matches no row returns no error, so check it hit one
  const remove = () => act(async () => {
    const { data, error } = await supabase.from('reviews').delete().eq('id', review.id).select('id')
    if (error || !data?.length) throw error ?? new Error('Review not deleted')
    onRemove(review.id)
  })

  return (
    <li className="admin-msg admin-review">
      <div className="admin-review__head">
        <Stars count={review.rating} />
        <span className={`admin-badge ${published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>{published ? 'Published' : 'Pending'}</span>
        <span className="admin-review__date">{lastSeen(review.updated_at)}</span>
      </div>
      <p className="admin-msg__text">{review.body}</p>
      <p className="admin-review__by"><strong>{review.author_name}</strong> · {review.travel_style}</p>
      <div className="admin-msg__actions">
        {confirming ? (
          <>
            <span className="admin-review__confirm">Delete this review?</span>
            <button type="button" className="btn btn--sm admin-btn-danger" disabled={busy} onClick={remove}>Delete</button>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={toggle}>{published ? 'Unpublish' : 'Approve'}</button>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(true)}>Delete</button>
          </>
        )}
      </div>
      {failed && <p className="admin-note--error admin-msg__error">Couldn't update this review. Try again.</p>}
    </li>
  )
}
```

In `frontend/src/styles.css`, add after the `.admin-btn-outline:disabled` rule:

```css
.admin-review { padding: 16px 18px; }
.admin-review__head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.admin-review .stars { color: #fbbf24; }
.admin-review__date { margin-left: auto; font-size: 14px; }
.admin-review__by { margin: 10px 0 0; font-size: 14px; }
.admin-review__by strong { color: var(--title); }
.admin-review__confirm { align-self: center; color: var(--title); font-weight: 500; }
.admin-btn-danger { background: #c0392b; border: 1px solid #c0392b; color: var(--white); }
.admin-btn-danger:disabled { opacity: 0.6; cursor: default; }
```

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/AdminReviews.jsx frontend/src/redirects.js frontend/src/redirects.test.js frontend/src/data.js frontend/src/App.jsx frontend/src/sections/AdminLayout.jsx frontend/src/styles.css
git commit -m "Add admin Reviews page with approve, unpublish and delete"
```

---

### Task 8: Final check and checkpoint

**Files:**
- Modify: `CHECKPOINT.md`

- [ ] **Step 1: Full verification**

Run from `frontend/`: `npx vitest run` and `npm run build`. Expected: every test file passes; build succeeds. Note the test count.

- [ ] **Step 2: Update the checkpoint**

In `CHECKPOINT.md`:
- "Last updated" line: the latest commit hash.
- Tests line: the new file and test counts.
- Supabase line: `001`–`006`, and add `006_reviews.sql` to the files to check before testing.
- Add a "Done" row: `| Rate Your Trip reviews: /app/review form, admin Reviews page (approve / unpublish / delete), approved reviews in the landing slider | \`2026-10-15-trip-reviews\` | <first> – <last> |`.
- "Next": add "Show the user's review on Profile; users delete their own review; per-destination reviews (Community Voice)".

- [ ] **Step 3: Commit**

```bash
git add CHECKPOINT.md
git commit -m "Checkpoint: Rate Your Trip reviews"
```

- [ ] **Step 4: Hand over the manual checks**

Tell the owner to run `006_reviews.sql`, then follow the spec's "Manual (owner)" list (steps 1–8).
