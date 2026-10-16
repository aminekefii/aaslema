# My moments in the profile dashboard — design

Date: 2026-10-16
Status: approved in brainstorming, awaiting spec review

## Goal

A **My moments** section, first in the profile dashboard sidebar, lists every
moment the signed-in user uploaded: photo, status (published or waiting for
approval), destination, highlight, caption, when it was posted and, once
published, its like count. View only. It becomes the page the navbar profile
circle opens.

Builds on `moments` and the private `moments` bucket (`007_moments.sql`),
`moment_likes` (`008_moment_likes.sql`), `ProfileLayout`, `photoUrls`
(`momentsApi.js`), `timeAgo` and `cities.js`.

## Decisions

| Question | Decision |
|---|---|
| Which moments | All of the user's moments, pending and approved, newest first (max 100) |
| Pending photos | Shown to their uploader: a new storage policy lets users read files in their own folder of the `moments` bucket that a moment uses (the app asks for 1-hour signed links) |
| Actions | None (view only) |
| Like count | Shown on published moments |
| Sidebar order | My moments, Edit profile, Rate your trip |
| Paths | `/app/profile` = My moments; Edit profile moves to `/app/profile/edit`; Rate your trip stays `/app/profile/review` |
| Navbar circle | Still links to `/app/profile`, which is now My moments |
| Email-change links | Come back to `/app/profile/edit` (was `/app/profile`) |

Trade-off accepted: until now nobody but admins could link to an unapproved
photo. With this change an uploader can make signed links to their own
pending photos while signed in (the link lifetime is chosen by the caller,
so it can be long) until an admin approves or deletes the moment. Files no
moment uses (uploaded without a moment, or left after an admin delete) stay
unreadable.

## Database and storage

New file `backend/supabase/011_my_moments.sql`, run once in the Supabase SQL
Editor after `007` and `008`; safe to re-run. Re-running `007` later does not
undo it (separate policy name).

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

-- Uploaders see their own photos, pending ones included (adds to "Moment photos: admins, or published").
-- Only photos a moment uses: a file uploaded without a moment, or left after an admin deleted the
-- moment, stays unreadable, so the bucket still can't host images nobody reviews.
drop policy if exists "Moment photos: uploader reads their own" on storage.objects;
create policy "Moment photos: uploader reads their own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text
    and public.moment_photo_is_used(name)
  );
```

Notes: storage policies for the same action are combined with OR, so the
existing "admins, or published" rule keeps working for everyone else. The
existing delete policy needs select too; it is unchanged and still only lets
an uploader delete a photo no moment uses.

## Shared code

### `src/moments.js` (pure, tested)

Adds `myMomentCard(row, cityList)` → `{ key, url, cityName, spot, caption, published, postedAt, likes }`:
- `cityName`: the matching city's `name` from `cityList`, else `row.city_id`.
- `published`: `Boolean(row.approved_at)`.
- `postedAt`: `row.created_at`.
- `likes`: `Number(row.likes ?? 0)`.
- `url`: `row.url ?? null`.

### `src/momentsApi.js`

Adds `fetchMyMoments()` → array of rows with `url` (from `photoUrls`), or
`null` if loading failed. Never throws. Rows whose link could not be made
keep `url: undefined` (the card shows "Photo unavailable").

## Screens

### Routing and sidebar

- `redirects.js`: `appPagePaths` gains `/app/profile/edit`.
- `App.jsx`: `/app/profile` → `inProfile(MyMoments)`,
  `/app/profile/edit` → `inProfile(EditProfile)`.
- `data.js` `profileNavLinks`: `['My moments', '/app/profile']`,
  `['Edit profile', '/app/profile/edit']`, `['Rate your trip', '/app/profile/review']`.
- `ProfileLayout.jsx` icons: My moments `Camera`, Edit profile `UserPen`,
  Rate your trip `Star`.
- `profileApi.js` `changeEmail`: `emailRedirectTo` → `/app/profile/edit`.

### `src/pages/MyMoments.jsx`

- Title "My moments - Aaslema"; heading "My moments"; lead "Photos you
  shared from destinations."
- States: "Loading your moments…"; error "Couldn't load your moments."
  with a "Try again" button; empty "You haven't shared any moments yet."
  with a link "Explore destinations" to `/app/destinations`.
- Grid `.my-moments` (3 / 2 / 1 columns at ≥ 992 / ≥ 576 / smaller) of
  cards `.my-moment`:
  - photo (4:3, cover) or a grey box "Photo unavailable";
  - badge: "Published" (`admin-badge--ok`) or "Waiting for approval"
    (`admin-badge--warn`);
  - destination name (bold) and, if set, the highlight with a pin icon;
  - caption;
  - footer: posted time (`timeAgo`, `<time dateTime>`) and, when published,
    "♥ N" (`Heart` icon + count, `aria-label="N likes"`).

## Files

| File | Change |
|---|---|
| `backend/supabase/011_my_moments.sql` | New |
| `frontend/src/moments.js`, `moments.test.js` | `myMomentCard` |
| `frontend/src/momentsApi.js` | `fetchMyMoments` |
| `frontend/src/pages/MyMoments.jsx` | New |
| `frontend/src/App.jsx`, `data.js`, `redirects.js`, `redirects.test.js` | Paths and sidebar |
| `frontend/src/sections/ProfileLayout.jsx` | Icons |
| `frontend/src/profileApi.js` | Email link → `/app/profile/edit` |
| `frontend/src/styles.css` | `.my-moments`, `.my-moment` |

## Testing

- **Automated (Vitest):** `moments.test.js` covers `myMomentCard` (known
  city name, unknown city falls back to id, pending vs published, likes as
  number, missing url → `null`). `redirects.test.js`: `/app/profile/edit`
  is an app page for signed-in users.
- **Manual (owner):**
  1. Run `011_my_moments.sql`. In Supabase Auth → URL Configuration, allow
     `<site>/app/profile/edit` (unless a `/**` wildcard already covers it).
  2. Navbar circle → "My moments" is first and active in the sidebar.
  3. Upload a moment on a destination → it appears here with its photo and
     "Waiting for approval".
  4. Admin approves it → "Published" and "♥ 0"; another user likes it →
     "♥ 1" after reload.
  5. A user with no moments sees the empty message and the link.
  6. Edit profile and Rate your trip still work from the sidebar;
     `/app/profile/edit` shows Edit profile; email change link lands there.
  7. Security: signed in as user B, `createSignedUrls` for user A's pending
     photo fails; `rpc('my_moments')` returns only B's moments; signed out it
     returns nothing.

## Future work

- Delete or edit own moments; link a published moment to its destination tab.
