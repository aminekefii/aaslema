# Community posts — design

Date: 2026-10-19
Status: approved in brainstorming, awaiting spec review

## Goal

Signed-in users publish posts on `/app/community`, edit and delete their own,
and like any post. Posts and likes are saved in Supabase, so everyone sees the
same posts and like counts on any device. A post is live as soon as it is
published: there is no admin approval.

The visitor page `/community` stays exactly as it is today (example posts,
posts and likes kept in the browser). Visitors are a later round.

Builds on destination moments (`007_moments.sql`, `008_moment_likes.sql`,
`010_author_photos.sql`, `momentsApi.js`, `moments.js`) and the current
`Community.jsx` (photos and tags already removed, Share shows "Coming soon").

## Decisions

| Question | Decision |
|---|---|
| Who can publish | Signed-in users only, on `/app/community` |
| Approval | None: a post shows for everyone right away |
| Form | Same as now: Title, City, Post |
| Card | Author's profile photo (initials if none), name, date, title, post text; like count; Share; Edit and Delete on your own posts |
| Author name and photo | Read live from `profiles`, so a later name or photo change shows on old posts |
| Likes | Shared count, one like per user per post, users can like their own post (unlike moments) |
| Edit / delete | Own posts only. Delete asks first. No "edited" label |
| Comments | Later. The comment count is hidden on `/app/community` |
| Reporting | Later. The ⋯ report menu stays as it is now (it only shows a thank-you message) |
| Share | Unchanged: "Coming soon" popup |
| Visitors (`/community`) | Unchanged |
| Old browser posts | Posts saved in the browser before this change are not moved over; `/app/community` ignores them |
| Example posts | Not shown on `/app/community` |
| Feed size | Newest 100 posts; the city filter and search work on those |

Signed-in users who open `/community` are already redirected to
`/app/community` (`redirects.js`), so in `Community.jsx` "`user` is set" means
"this is the signed-in page".

## Limits

Counted in characters as the user sees them (`textLength` in `reviews.js`,
same as `char_length` in Postgres), after trimming spaces.

| Field | Rule | Message |
|---|---|---|
| Title | 3–120 | "Please write a title (at least 3 characters)." / "Your title is too long (120 characters max)." |
| City | One of the ids in `cities.js` | "Please choose a city." |
| Post | 20–2000 | "Please write at least 20 characters." / "Your post is too long (2000 characters max)." |

The Publish button stays disabled under 20 characters, as now.

## Database

New file `backend/supabase/014_community_posts.sql`, run once after `009`; safe
to re-run (re-running does not change existing tables). It stops with an
error if `profiles` doesn't exist, like `010`.

**`community_posts`**

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`
- `author_name text not null` (1–100 characters): name at publish time, used
  only if the profile row is missing, as in moments
- `city_id text not null check (city_id ~ '^[a-z0-9-]{1,60}$')`
- `title text not null` (3–120 characters, trimmed), `body text not null`
  (20–2000 characters, trimmed), checked in the table too
- `created_at timestamptz not null default now()`
- index on `created_at desc`

Rules (row level security on): signed-in users insert
(`author_name, city_id, title, body` only; `user_id` from the default), update
(`city_id, title, body` only) and delete rows where `user_id = auth.uid()`, and
select their own rows (so insert/update can return the row). Visitors get
nothing.

**`community_post_likes`**: same shape and rules as `moment_likes`:
`(user_id, post_id)` primary key, `post_id` references `community_posts (id)
on delete cascade`, index on `post_id`. Users insert (`post_id` only), read and
delete only their own likes; any existing post can be liked, own posts too.
Nobody can see who liked what.

**`community_feed()`**: `security definer` function, granted to
`authenticated` only. Newest 100 posts with: `id, author_name` (profile
`full_name`, else the saved name), `author_avatar` (profile `avatar_path`),
`city_id, title, body, created_at, likes` (count), `liked` (by the caller),
`mine` (the caller's own). No user ids, as in `published_moments`.

## Frontend

**`frontend/src/communityPosts.js`** (pure, tested): the limits above and
`postFromForm({ title, cityId, content }, user)` → `{ row: { title, city_id,
body, author_name } }` or `{ error }`; `author_name` is `displayName(user)` cut
to 100 characters, as in `momentFromForm`.

**`frontend/src/communityApi.js`** (never throws, like `momentsApi.js`):

- `fetchFeed()` → posts with `likes` / `liked` / `mine` as plain values and
  `author_avatar_url` (`avatarUrl`), or `null` on failure
- `createPost(row)`, `updatePost(id, fields)`, `deletePost(id)` →
  `{ error }` on failure
- `setPostLike(id, on)` → `true` / `false`

**`Community.jsx`**

- No `user`: the visitor page, exactly as now.
- With `user`: posts come from `fetchFeed()`, not the browser.
  - Loading: "Loading posts…". Failure: "Couldn't load posts." with Try again.
  - Publish / Save changes: validate with `postFromForm`; show the error in the
    form; buttons disabled while saving; on success close the form, reload the
    feed and show the existing toast ("Post published" / "Changes saved"). On
    failure keep the form open with "Couldn't save your post. Please try
    again."
  - Like: flips straight away; if saving fails it flips back and the toast
    says "Couldn't save your like. Please try again."
  - Own posts show **Edit** and **Delete**. Delete opens a popup "Delete this
    post?" (Cancel / Delete); on success the post leaves the list and the toast
    says "Post deleted"; on failure "Couldn't delete your post. Please try
    again."
  - Card: photo (`author_avatar_url`, else initials), author name, date,
    title, text, like button, Share, Edit/Delete. No comment count.
  - The city filter, search and "About the forum" box work as now, on the
    loaded posts. The empty state's button opens the New post form.

How the page is split (one component with two data sources, or a separate
signed-in component) is left to the builder, as long as `/community` doesn't
change.

## Files

| File | Change |
|---|---|
| `backend/supabase/014_community_posts.sql` | New |
| `frontend/src/communityPosts.js`, `communityPosts.test.js` | New |
| `frontend/src/communityApi.js` | New |
| `frontend/src/pages/Community.jsx` | Signed-in mode |
| `frontend/src/styles.css` | Only if needed (loading/error, delete popup) |

## Testing

- **Automated (Vitest):** `communityPosts.test.js`: trims, every limit and
  message, unknown city, `author_name` from the user and cut to 100
  characters, emoji counted as one character.
- **Manual (owner):**
  1. Run `014_community_posts.sql`.
  2. Signed in as A on `/app/community`: publish a post → it shows at the top
     with A's photo, name and "Just now".
  3. Signed in as B (another browser): A's post shows; like it → 1; reload
     keeps it; unlike → 0. B has no Edit/Delete on A's post.
  4. A edits the post (title, city, text) → B sees the change after reload.
  5. A deletes the post after the popup → it is gone for B too.
  6. A changes their profile photo → their posts show the new photo.
  7. Signed out on `/community`: the example posts and browser-only posts,
     as before.
  8. Before `014` is run: "Couldn't load posts." with Try again.

## Future work

- Comments, reporting posts, sharing, visitors reading and liking real posts,
  admin moderation, more than 100 posts.
