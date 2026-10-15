# Rate Your Trip: user reviews with admin approval — design

Date: 2026-10-15
Status: approved in brainstorming, awaiting spec review

## Goal

Signed-in users leave one review (stars, travel style, text) from a new
"Rate Your Trip" page. Reviews are saved in Supabase and wait for an admin,
who approves, unpublishes or deletes them on a new Reviews page in the admin
dashboard. Approved reviews replace the sample reviews in the landing page's
"What Our Users Say" slider, with the same layout.

Builds on `public.is_admin()`, `AdminLayout` and `redirectFor` from the admin
parts 1 and 2 (`2026-10-15-admin-users-design.md`, `2026-10-15-admin-messages-design.md`).

## Decisions

| Question | Decision |
|---|---|
| Link name | "Rate Your Trip", page `/app/review` |
| Where the link is | Signed-in navbar only, between Community and Contact |
| Who can review | Signed-in users; one review each, which they can edit |
| Editing a review | Any change by the author sends it back to pending |
| Card on the landing page | Initials circle (in place of the photo), account name, travel style picked on the form, the review's stars |
| Travel styles | Backpacker, Bikepacker, History Traveler, Solo Traveler, Other |
| Sample reviews | Shown only while there are no approved reviews, while loading, or if loading fails |
| Admin actions | Approve, Unpublish, Delete (in-page confirm); tabs Pending / Published / All; pending count in the sidebar |
| Data access | Table + row level security + trigger; the public reads approved reviews through a `security definer` function that returns only card fields |

## Database

New file `backend/supabase/006_reviews.sql`, run once in the Supabase SQL
Editor after 001; safe to re-run.

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

Notes:
- `user_id` is `unique`: a second insert by the same user fails with `23505`.
- Authors cannot delete their own review (admins only); this keeps the
  form to "write or edit".
- Visitors (`anon`) have no table access at all; they only see what
  `published_reviews()` returns.

## Shared name helpers

New `src/names.js` (pure, tested), moved from `AppHeader.jsx`:
- `displayName(user)` — `user.user_metadata?.full_name` (trimmed) or, when
  empty, the part of `user.email` before `@`.
- `initials(name)` — "Leila Ben Ali" → "LB", "tom" → "T" (the existing logic).

`AppHeader` imports `initials` from here. Its shown name stays
`full_name || email` (no visible change in the navbar).

## Rate Your Trip page

### Routing and navbar

- `appPagePaths` gains `'/app/review'`; `App.jsx` `appPages` gains
  `'/app/review': Review`.
- `appNavLinks` gains `['Rate Your Trip', '/app/review']` between Community
  and Contact. The public `navLinks` do not change.

### `src/pages/Review.jsx`

- `document.title` = `Rate Your Trip - Aaslema`. Page banner "Rate Your Trip"
  with the line "Tell other travellers how your trip went."
- On mount: `supabase.from('reviews').select('*').eq('user_id', user.id).maybeSingle()`.
  While loading: "Loading your review…". Load error: "Couldn't load your
  review." + "Try again".
- Form:
  - **Stars:** five star buttons in a `role="radiogroup"` labelled "Your
    rating"; each is `role="radio"` with `aria-checked` and label "N stars".
    Hover previews, click sets. No default (0 = not chosen).
  - **Travel style:** `<select>` with the five styles; placeholder
    "Choose your travel style".
  - **Review:** `<textarea>` with a live counter "n / 1000".
  - **Button:** "Submit review" (new) or "Update review" (existing).
- An existing review fills the form and shows a status line:
  "Waiting for approval" when `approved_at` is null, "Published on the site"
  otherwise. When it is published, a note under the button says
  "Changing your review sends it back for approval."
- Submit: validate with `reviewFromForm` and show the first error. Then
  insert (new) or `update(row).eq('id', review.id).select().single()`
  (existing). While saving: inputs disabled, button "Saving…".
  - Insert uses `.insert(row).select().single()` so the page gets the
    saved row (users may read their own review).
  - Success: `savedMessage(row)` — "Thanks! Your review will appear on the
    site once an admin approves it.", or "Saved. Your review is still on the
    site." when nothing changed and it stays published. The form stays filled
    with the saved review and the status follows the saved row.
  - Insert `23505` (a review was saved from another tab): reload the
    review and show "You already have a review; it's shown below."
  - Any other failure: "Couldn't save your review. Please try again." Typed
    values stay.

### `src/reviews.js` (pure, tested)

- `travelStyles` — the five style names, in the order above.
- `reviewFromForm({ rating, travelStyle, body }, user)` returns
  `{ error }` (first failing check) or `{ row: { author_name, travel_style, rating, body } }`:
  - rating not an integer 1–5 → "Please choose a star rating."
  - travel style not in `travelStyles` → "Please choose your travel style."
  - body under 10 characters after trim → "Please write at least 10 characters."
  - body over 1000 after trim → "Your review is too long (1000 characters max)."
  - `author_name` is `displayName(user)` cut to 100 characters; `body` trimmed.
  - Lengths are counted in code points (`textLength`), like Postgres
    `char_length`, so an emoji counts as one character.
- `cardsFromReviews(rows)` → `[{ key: id, quote: body, name: author_name, role: travel_style, rating, avatar: null }]`.

## Landing page slider

`src/sections/Testimonials.jsx`:
- On mount, `fetchPublishedReviews()` (new, in `src/reviewsApi.js`; never
  throws; returns `null` on error or without Supabase) → `cardsFromReviews`.
- Cards shown: the published cards when there is at least one, otherwise
  `testimonials` from `data.js` (also while loading or on error).
- Markup stays the same, with two differences:
  - `<Stars count={t.rating ?? 5} />`.
  - When `t.avatar` is empty, a `<span className="review__initials">` with
    `initials(t.name)` takes the image's place (same size and shape).
- Keys use `t.key ?? t.name`. The slider's positions and autoplay already
  follow the number of cards.

## Admin Reviews page

### Routing and sidebar

- `adminPagePaths` gains `'/admin/reviews'`; `adminNavLinks` gains
  `['Reviews', '/admin/reviews']` after Messages; `App.jsx` `adminPages`
  gains `'/admin/reviews': AdminReviews`.
- `AdminLayout`: icon `Star` for Reviews. `useNewMessageCount` becomes
  `useAdminCount(table, column, event)` used twice: unhandled messages
  (`contact_messages`, `handled_at`, `admin:messages-changed`) and pending
  reviews (`reviews`, `approved_at`, `admin:reviews-changed`). Badge on
  Reviews when the pending count is above 0.

### `src/pages/admin/AdminReviews.jsx`

- On mount: `supabase.from('reviews').select('*').order('created_at', { ascending: false })`;
  `document.title` = `Reviews - Aaslema Admin`.
- Tabs "Pending (n)", "Published (n)", "All (n)"; default Pending.
- Each review: stars, author name, travel style, `lastSeen(updated_at)`,
  full text with line breaks kept, a "Published" or "Pending" tag, and:
  - **Approve** (pending) → `update({ approved_at: <now ISO> })`;
    **Unpublish** (published) → `update({ approved_at: null })`.
    Both match `{ id, updated_at }` of the review the admin is looking at
    (`approvalChange`), so an author edit made meanwhile is never approved
    unseen; then `.select().single()` and replace the review in state. No
    match (`PGRST116`) → "This review was changed or removed since the page
    loaded. Reload to see it."

  - **Delete** → in place "Delete this review?" with **Delete** and
    **Cancel** → `delete().eq('id', id)`; on success remove it from state.
  - After a successful change: dispatch `admin:reviews-changed`. On failure:
    "Couldn't update this review. Try again." on that review. Buttons are
    disabled while a request runs.
- Empty states: Pending → "No reviews waiting for approval."; other tabs →
  "No reviews here."
- Load errors: same as Messages (`42501` → sign out and in again; other →
  "Couldn't load reviews: {message}" + "Try again").

### `src/adminReviews.js` (pure, tested)

- `isPublished(r)` — `Boolean(r.approved_at)`.
- `filterReviews(reviews, tab)` — `tab` is `'pending' | 'published' | 'all'`.
- `reviewCounts(reviews)` → `{ pending, published, all }`.

## Files

New:
- `backend/supabase/006_reviews.sql`
- `frontend/src/names.js` + `names.test.js`
- `frontend/src/reviews.js` + `reviews.test.js`
- `frontend/src/reviewsApi.js`
- `frontend/src/adminReviews.js` + `adminReviews.test.js`
- `frontend/src/pages/Review.jsx`
- `frontend/src/pages/admin/AdminReviews.jsx`

Changed:
- `frontend/src/data.js` — `appNavLinks`, `adminNavLinks`
- `frontend/src/redirects.js` + test — `/app/review`, `/admin/reviews`
- `frontend/src/App.jsx` — `appPages`, `adminPages`
- `frontend/src/sections/AppHeader.jsx` — `initials` from `names.js`
- `frontend/src/sections/AdminLayout.jsx` — Reviews icon, `useAdminCount`, pending badge
- `frontend/src/sections/Testimonials.jsx` — published reviews, real stars, initials
- `frontend/src/styles.css` — review form (stars, counter, status), `review__initials`, admin reviews list
- `backend/README.md` — step 6

## Testing

- **Vitest:**
  - `names.test.js` — full name, blank full name → email prefix, initials.
  - `reviews.test.js` — each error and its boundary (rating 0/1/5/6/2.5,
    unknown style, body 9/10 and 1000/1001 after trim), trimming,
    author name from the user and cut at 100, `cardsFromReviews`.
  - `adminReviews.test.js` — filtering and counts.
  - `redirects.test.js` — `/app/review` allowed when signed in, `/signin`
    when signed out; `/admin/reviews` for admins only.
- **Build:** `npm run build`.
- **Manual (owner):**
  1. Run `006_reviews.sql` in the SQL Editor.
  2. Signed in as a normal user, the navbar shows "Rate Your Trip" between
     Community and Contact. Submit without stars → "Please choose a star
     rating."; submit a valid review → thanks message, "Waiting for approval".
  3. Reload: the form is filled with the review.
  4. As admin, the sidebar shows "Reviews 1"; Approve it → it moves to
     Published, the badge goes away.
  5. Signed out, the landing slider shows only that review, with its stars
     and initials; the samples are gone.
  6. As the user, edit the review → "Waiting for approval" again; the
     landing slider shows the samples again; the admin badge is back.
  7. Admin: Unpublish and Delete (with Cancel first) both work.
  8. SQL Editor checks (then `reset role;`):
     `set role anon; select * from public.reviews;` → permission denied.
     As a normal user:
     `set role authenticated; set request.jwt.claims = '{"sub": "<user id>", "role": "authenticated"}';`
     then `update public.reviews set approved_at = now() where user_id = '<user id>';`
     → "only admins can approve reviews".

## Future work

- Show the user's review on their Profile page.
- Let users delete their own review.
- Reviews for a single destination ("Community Voice" in `planning.txt`).
