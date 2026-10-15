# Destination moments with admin approval — design

Date: 2026-10-15
Status: approved in brainstorming, awaiting spec review

## Goal

Signed-in users upload a photo moment (photo, caption, optional highlight)
from a destination page. The moment belongs to that destination and waits for
an admin, who approves or deletes it on a new Moments page in the admin
dashboard. Approved moments show to everyone in a carousel in the
destination's Moments tab: photo, uploader's name, caption, highlight, and
how long ago it was posted ("5h ago", "a day ago").

Replaces today's moments, which live only in the uploader's browser
(`localStorage`, data URLs). Builds on `public.is_admin()`, `AdminLayout`,
`useAdminCount`, `redirectFor`, `names.js` and `adminReviews.js`.

## Decisions

| Question | Decision |
|---|---|
| Who can upload | Signed-in users (visitors already see a sign-in link) |
| Destination | The page where the user clicked "Add moment" (`city_id`); not editable |
| Highlight ("spot") | Optional, one of that destination's highlights |
| Caption | Required, 3–300 characters |
| Photo storage | Private Supabase Storage bucket `moments`, JPEG only, ≤ 2 MB; photos shrunk in the browser to ≤ 1600 px first |
| Who sees a photo | Admins always; everyone else (the uploader too) only once approved (database-enforced, via signed URLs), so the bucket can't host unreviewed images |
| After upload | Popup: under review; nothing else shown to the user until approval |
| Admin actions | Approve, Delete (in-page confirm; also removes the file). No unpublish |
| User actions after upload | None (no edit, no delete) |
| Carousel | Arrows + drag/swipe, 3 / 2 / 1 cards (≥ 992 / ≥ 767 / smaller), no autoplay |
| Date on card | Time since upload (`created_at`), see `timeAgo` |
| Old browser-only moments | No longer shown; not migrated |

## Database and storage

New file `backend/supabase/007_moments.sql`, run once in the Supabase SQL
Editor after 001; safe to re-run.

```sql
-- Destination moments: photos users upload, shown after an admin approves them.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run, but re-running
-- does not change an existing table: alter its constraints by hand if they change later.

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  spot text check (spot is null or (char_length(spot) <= 100 and btrim(spot, E' \t\r\n') <> '')),
  caption text not null check (char_length(btrim(caption, E' \t\r\n')) between 3 and 300),
  author_name text not null check (char_length(author_name) <= 100 and btrim(author_name, E' \t\r\n') <> ''),
  image_path text not null unique check (image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists moments_city_approved_idx on public.moments (city_id, approved_at desc);

alter table public.moments enable row level security;

-- Uploaders fill the content columns once; only admins change approved_at.
revoke all on public.moments from anon, authenticated;
grant select, delete on public.moments to authenticated;
grant insert (city_id, spot, caption, author_name, image_path) on public.moments to authenticated;
grant update (approved_at) on public.moments to authenticated;

drop policy if exists "Users read their own moments, admins all" on public.moments;
create policy "Users read their own moments, admins all" on public.moments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Uploaded photo exists? Runs as the owner, because uploaders can't read storage rows.
create or replace function public.moment_photo_exists(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from storage.objects o where o.bucket_id = 'moments' and o.name = path)
$$;

revoke all on function public.moment_photo_exists(text) from public;
grant execute on function public.moment_photo_exists(text) to authenticated;

-- The photo must already be uploaded, in the uploader's own folder (it can't be
-- swapped later: there is no storage update rule and the name is taken)
drop policy if exists "Users add their own moments" on public.moments;
create policy "Users add their own moments" on public.moments
  for insert to authenticated
  with check (
    user_id = auth.uid() and approved_at is null
    and split_part(image_path, '/', 1) = auth.uid()::text
    and public.moment_photo_exists(image_path)
  );

drop policy if exists "Admins approve moments" on public.moments;
create policy "Admins approve moments" on public.moments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete moments" on public.moments;
create policy "Admins delete moments" on public.moments
  for delete to authenticated
  using (public.is_admin());

-- Helpers for the storage rules below. They run as the owner so the rules can
-- look at moments the caller is not allowed to read.
create or replace function public.moment_photo_is_published(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moments m where m.image_path = path and m.approved_at is not null)
$$;

create or replace function public.moment_photo_is_used(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moments m where m.image_path = path)
$$;

revoke all on function public.moment_photo_is_published(text) from public;
revoke all on function public.moment_photo_is_used(text) from public;
grant execute on function public.moment_photo_is_published(text) to anon, authenticated;
grant execute on function public.moment_photo_is_used(text) to authenticated;

-- Approved moments of one destination, newest approval first, without user ids.
create or replace function public.published_moments(p_city_id text)
returns table (id uuid, author_name text, spot text, caption text, image_path text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.author_name, m.spot, m.caption, m.image_path, m.created_at
  from public.moments m
  where m.city_id = p_city_id and m.approved_at is not null
  order by m.approved_at desc
  limit 50
$$;

revoke all on function public.published_moments(text) from public;
grant execute on function public.published_moments(text) to anon, authenticated;

-- Private bucket: JPEG only, 2 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload moment photos to their folder" on storage.objects;
create policy "Users upload moment photos to their folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );

-- Not even the uploader can link to an unapproved photo, so the bucket can't host unreviewed images
drop policy if exists "Moment photos: uploader, admins, or published" on storage.objects;
drop policy if exists "Moment photos: admins, or published" on storage.objects;
create policy "Moment photos: admins, or published" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'moments' and (public.is_admin() or public.moment_photo_is_published(name)));


-- Admins remove any photo; uploaders only a photo no moment uses (cleanup after a failed save)
drop policy if exists "Moment photos: admins, or uploader before saving" on storage.objects;
create policy "Moment photos: admins, or uploader before saving" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'moments' and (
      public.is_admin()
      or ((storage.foldername(name))[1] = auth.uid()::text and not public.moment_photo_is_used(name))
    )
  );
```

Notes:
- No update policy on `storage.objects`: files are never overwritten (uploads
  use `upsert: false`).
- Nobody can edit a moment's content after it is saved; only `approved_at`
  changes, and only by admins.
- Only admins and published photos can be read, so nobody can share a link
  to an unreviewed photo.
- A moment can only point at a photo that is already uploaded
  (`moment_photo_exists`), and that photo can never be replaced, so what the
  admin approves is what goes live.
- Uploaders may delete an unused photo (cleanup after a failed save), but
  Supabase's `remove` also needs read access, which they don't have, so the
  cleanup can fail; the leftover file is private and unused.


## Shared code

### `src/usePerView.js`

The `usePerView` hook moves out of `Testimonials.jsx` unchanged (3 / 2 / 1
by window width, updates on resize) and is exported as default. Testimonials
imports it; no visible change.

### `src/timeAgo.js` (pure, tested)

`timeAgo(iso, now = new Date())`, with `m` = whole minutes since `iso`:
- `m < 1` → "Just now"
- `m < 60` → "`m` min ago"
- under 24 h → "`h`h ago"
- under 48 h → "a day ago"
- under 7 days → "`d` days ago"
- under 14 days → "a week ago"
- under 30 days → "`w` weeks ago" (`w` = whole weeks)
- otherwise → `new Date(iso).toLocaleDateString()`
- Future dates (clock skew) count as "Just now".

### `src/moments.js` (pure, tested)

- `CAPTION_MAX = 300`, `PHOTO_MAX_BYTES = 15 * 1024 * 1024`.
- `momentFromForm({ file, caption, spot }, user, city)` returns `{ error }`
  (first failing check) or `{ row: { city_id, spot, caption, author_name } }`:
  - no file → "Please choose a photo."
  - `file.type` not starting with `image/` → "Please choose an image file."
  - `file.size` over `PHOTO_MAX_BYTES` → "This photo is too large (15 MB max)."
  - caption under 3 characters after trim → "Please write a caption (at least 3 characters)."
  - caption over 300 after trim → "Your caption is too long (300 characters max)."
  - `spot`: `null` when empty; must be one of `city.highlights`, otherwise
    `null`.
  - `author_name`: `displayName(user)` cut to 100 characters (code points).
  - Lengths in code points (`textLength` from `reviews.js`).
- `momentPath(userId, id)` → `` `${userId}/${id}.jpg` ``.
- `spotMoments(moments, spot)` → the moments whose `spot` equals `spot`.

### `src/imageResize.js`

`resizeToJpeg(file, maxSide = 1600, quality = 0.85)` → `Promise<Blob>`:
`createImageBitmap(file)`, scale so the longest side is ≤ `maxSide` (never
enlarge), draw on a canvas with a white background (transparent PNGs), and
`canvas.toBlob(..., 'image/jpeg', quality)`. Rejects if the image cannot be
decoded. Not unit-tested (needs a browser).

### `src/momentsApi.js` (never throws)

- `photoUrls(paths)` → `{ [path]: signedUrl }` via
  `supabase.storage.from('moments').createSignedUrls(paths, 3600)`; `{}` on error.
- `fetchPublishedMoments(cityId)` → `published_moments` rows, each with `url`
  added from `photoUrls`; rows without a URL are dropped. `null` on error or
  without Supabase.
- `uploadMoment(file, row, userId)` → `{ ok: true }` or `{ error }`:
  1. `resizeToJpeg(file)`; failure → `{ error: "Couldn't read this photo. Try another one." }`.
  2. Blob over 2 MB → retry once at quality 0.7; still over → `{ error: 'This photo is too large. Try a smaller one.' }`.
  3. Upload to `momentPath(userId, crypto.randomUUID())` with
     `{ contentType: 'image/jpeg', upsert: false }`.
  4. Insert `{ ...row, image_path }` into `moments` (no `.select()`).
  5. If the insert fails, remove the uploaded file (errors ignored).
  6. Upload or insert failure → `{ error: "Couldn't upload your moment. Please try again." }`.

## Destination page (`src/pages/CityDetail.jsx`)

- Remove the `localStorage` moments (`moments_${id}` key, `readList`/
  `writeList` for moments, `handleFinishUpload`'s local save). The plan
  (`planned_cities`) still uses `localStorage`.
- On mount and when `city.id` changes: `fetchPublishedMoments(city.id)` →
  state `moments`: `undefined` while loading, then the rows, or `[]` when
  loading failed (`null` from the API).
- **Moments tab:**
  - Header as today ("Add moment" for users, sign-in link for visitors).
  - Loading → "Loading moments…".
  - Empty (none approved, or loading failed) → the current "No moments yet" box.
  - Otherwise → `<MomentsCarousel moments={moments} />`.
- **Highlights tab:** thumbnails and counts use `spotMoments(moments ?? [], h)`
  (approved moments only); `img src` is the signed `url`.
- **Upload popup** (title "Add a moment", same layout):
  - The photo picker keeps `File` in state and shows a preview with
    `URL.createObjectURL` (revoked when replaced or closed).
  - Highlight select as today (optional); caption textarea with a live
    counter "n / 300".
  - Submit: `momentFromForm` → first error shown in the popup; else
    `uploadMoment`. While uploading: inputs disabled, button "Uploading…".
  - Success: the form popup closes and a second popup opens: title
    "Thanks for sharing!", text "Your moment is under review and will appear
    here once an admin approves it.", button "Close".
  - Failure: the error under the button; the form keeps its values.

## `src/components/MomentsCarousel.jsx`

- Props: `moments` (rows with `url`).
- `usePerView()`; `positions = max(1, moments.length - perView + 1)`;
  index clamped when `positions` shrinks.
- Track like the reviews slider (`translateX(-index * 100 / perView %)`),
  cards with `flexBasis: 100 / perView %`.
- **Arrows:** "Previous" / "Next" buttons (`ChevronLeft` / `ChevronRight`,
  `aria-label`s "Previous moments" / "Next moments"), disabled at the ends,
  hidden when everything fits (`positions === 1`).
- **Swipe:** pointer drag over 40 px moves one step (same as the reviews slider).
- **Card** (`figure.moment-card`): photo (`aspect-ratio: 4 / 3`,
  `object-fit: cover`, `alt` = caption), then the name (bold), the caption
  (up to 3 lines, `overflow-wrap: anywhere`), the highlight with a pin icon
  when set, and `timeAgo(created_at)` as a `<time dateTime>`.

## Admin Moments page

### Routing and sidebar

- `adminPagePaths` gains `'/admin/moments'`; `adminNavLinks` gains
  `['Moments', '/admin/moments']` after Reviews; `App.jsx` `adminPages`
  gains `'/admin/moments': AdminMoments`.
- `AdminLayout`: icon `Camera`; badge from
  `useAdminCount('moments', 'approved_at', 'admin:moments-changed')`.

### `src/pages/admin/AdminMoments.jsx`

- On mount: `supabase.from('moments').select('*').order('created_at', { ascending: false })`,
  then `photoUrls` for all `image_path`s. `document.title` =
  `Moments - Aaslema Admin`.
- Tabs "Pending (n)", "Published (n)", "All (n)", default Pending, using
  `filterReviews` / `reviewCounts` / `isPublished` from `adminReviews.js`
  (they only look at `approved_at`).
- Each moment: photo (or "Photo unavailable"), destination name (from
  `cities`), highlight, caption, author name, `lastSeen(created_at)`, a
  "Published" / "Pending" tag, and:
  - **Approve** (pending only) → `update({ approved_at: <now ISO> }).eq('id', id).select().single()`;
    replace in state.
  - **Delete** → "Delete this moment?" with **Delete** / **Cancel** →
    `delete().eq('id', id).select('id')` (must return a row), then
    `storage.from('moments').remove([image_path])` (errors ignored: the file
    is private and no longer published); remove from state.
  - After a change: dispatch `admin:moments-changed`. Failure: "Couldn't
    update this moment. Try again." on that moment.
- Empty states: Pending → "No moments waiting for approval."; others →
  "No moments here." Load errors as on Reviews.

## Files

New:
- `backend/supabase/007_moments.sql`
- `frontend/src/usePerView.js`
- `frontend/src/timeAgo.js` + `timeAgo.test.js`
- `frontend/src/moments.js` + `moments.test.js`
- `frontend/src/imageResize.js`
- `frontend/src/momentsApi.js`
- `frontend/src/components/MomentsCarousel.jsx`
- `frontend/src/pages/admin/AdminMoments.jsx`

Changed:
- `frontend/src/sections/Testimonials.jsx` — `usePerView` import
- `frontend/src/pages/CityDetail.jsx` — Supabase moments, upload, carousel, popups
- `frontend/src/redirects.js` + test — `/admin/moments`
- `frontend/src/data.js` — `adminNavLinks`
- `frontend/src/App.jsx` — `adminPages`
- `frontend/src/sections/AdminLayout.jsx` — Moments icon and badge
- `frontend/src/styles.css` — carousel, moment cards, upload counter, admin moments
- `backend/README.md` — step 7

## Testing

- **Vitest:**
  - `timeAgo.test.js` — each boundary (59 s, 1 min, 59 min, 60 min, 23 h,
    24 h, 47 h, 48 h, 6 d, 7 d, 13 d, 14 d, 29 d, 30 d), future dates.
  - `moments.test.js` — each error and its boundary (caption 2/3 and
    300/301 after trim, emoji counted once; file type; 15 MB / +1 byte),
    spot kept / unknown → `null` / empty → `null`, author name, `momentPath`,
    `spotMoments`.
  - `redirects.test.js` — `/admin/moments` for admins only.
- **Build:** `npm run build`.
- **Manual (owner):**
  1. Run `007_moments.sql`; in Storage, a private `moments` bucket exists.
  2. As a user on `/app/destinations/tozeur`, Moments tab → Add moment:
     submit without a photo → "Please choose a photo."; with a large phone
     photo, a caption and a highlight → "Thanks for sharing!" popup.
  3. The Moments tab still shows "No moments yet" (pending is hidden).
  4. As admin, the sidebar shows "Moments 1"; the page shows the photo;
     Approve → Published, badge gone.
  5. Signed out on `/destinations/tozeur`: the carousel shows the card with
     photo, name, caption, highlight and "Just now"; the highlight card shows
     the thumbnail. Upload 4 more and approve them: arrows and swipe move
     through them; 3 / 2 / 1 cards at desktop / tablet / phone widths.
  6. Admin Delete (Cancel first) removes the card and the file in Storage.
  7. Security checks: a pending photo's signed URL cannot be created while
     signed out (`createSignedUrls` returns an error for it); in the SQL
     Editor as a normal user (`set role authenticated; set request.jwt.claims = '{"sub": "<user id>", "role": "authenticated"}';`)
     `update public.moments set approved_at = now();` changes 0 rows.

## Future work

- Users delete their own moments; a "My moments" list on Profile.
- Unpublish from the admin page.
- Likes or comments on moments.
