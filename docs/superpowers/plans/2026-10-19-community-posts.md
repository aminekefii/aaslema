# Community Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users publish, edit and delete their own posts on `/app/community` and like any post, all saved in Supabase; `/community` for visitors stays as it is.

**Architecture:** `014_community_posts.sql` adds `community_posts`, `community_post_likes` and a `community_feed()` function, copying the moments pattern (`007`/`008`/`010`). A pure `communityPosts.js` validates the form; `communityApi.js` talks to Supabase and never throws; `Community.jsx` uses them when `user` is set and keeps today's browser-only behaviour when it isn't.

**Tech Stack:** React 18 + Vite, Supabase, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-19-community-posts-design.md`

## Global Constraints

- Limits (trimmed, counted with `textLength` from `reviews.js`): title 3–120, post 20–2000, author name cut to 100, city one of `cities.js` ids.
- Copy (exact): "Please write a title (at least 3 characters).", "Your title is too long (120 characters max).", "Please choose a city.", "Please write at least 20 characters.", "Your post is too long (2000 characters max).", "Loading posts…", "Couldn't load posts.", "Try again", "Couldn't save your post. Please try again.", "Couldn't save your like. Please try again.", "Delete this post?", "Cancel", "Delete", "Post deleted", "Couldn't delete your post. Please try again.", "Post published", "Changes saved".
- `/community` (no `user`) behaves exactly as today: example posts, `community_posts` / `community_likes` in localStorage. Signed-in mode never reads or writes those keys.
- No approval, no admin rules, no comment count on `/app/community`; Share stays "Coming soon"; the ⋯ report menu stays as now.
- `community_feed()` returns no user ids; granted to `authenticated` only.
- SQL is run by hand, safe to re-run, stops if `public.profiles` is missing.
- Style: 2-space indent, no semicolons, single quotes; tests from `frontend/`: `npx vitest run`.

## Review Focus

1. Double-clicking Publish / Save changes / Delete must not save twice. Pinned in Task 4: `saving` disables the form and popup buttons.
2. Quick repeated clicks on Like must not leave the count wrong. Pinned in Task 4: the like button is disabled while that post's like saves (per-id busy set), and a failure rolls back that post only.
3. Editing or deleting a post that was already deleted (another tab) must show the error, not "Changes saved". Pinned in Task 3: `updatePost` / `deletePost` use `.select('id')` and treat zero rows as an error.
4. Before `014` is run, `/app/community` shows "Couldn't load posts." with Try again, and Publish shows the save error. Pinned by Task 3 returning `null` / `{ error }` and manual check 8.
5. Signing in must not wipe a visitor's browser posts: they are still on `/community` after signing out. Pinned in Task 4 by the localStorage writes staying in the visitor branch only.

---

### Task 1: SQL `community_posts`, likes and feed

**Files:** Create `backend/supabase/014_community_posts.sql`

- [ ] **Step 1:** Write the file following the spec's Database section, modelled on `008_moment_likes.sql` and `010_author_photos.sql`:
  - header comment (what it does, run after `009`, safe to re-run, re-running doesn't alter existing tables);
  - the `do $$` guard from `010`, message `'Run 009_profiles.sql before 014_community_posts.sql'`;
  - `community_posts` with checks: `char_length(author_name) between 1 and 100`, `city_id ~ '^[a-z0-9-]{1,60}$'`, `title = btrim(title) and char_length(title) between 3 and 120`, `body = btrim(body) and char_length(body) between 20 and 2000`; index `community_posts_created_idx on (created_at desc)`;
  - RLS on; `revoke all ... from anon, authenticated`; `grant select, delete`, `grant insert (author_name, city_id, title, body)`, `grant update (city_id, title, body)` to `authenticated`; policies (drop if exists + create) "Users read their own posts" (select), "Users publish their own posts" (insert, `with check (user_id = auth.uid())`), "Users edit their own posts" (update, `using` and `with check` `user_id = auth.uid()`), "Users delete their own posts" (delete);
  - `community_post_likes` exactly like `moment_likes` but `post_id` → `community_posts (id) on delete cascade`, index `community_post_likes_post_idx`, insert policy `with check (user_id = auth.uid())` (no "can be liked" helper);
  - `drop function if exists public.community_feed();` then `community_feed()` returning `(id uuid, author_name text, author_avatar text, city_id text, title text, body text, created_at timestamptz, likes bigint, liked boolean, mine boolean)`, `security definer`, `set search_path = ''`, left join `profiles`, `order by created_at desc limit 100`; `revoke all ... from public; grant execute ... to authenticated`.
  - Note: Postgres `btrim` trims only spaces; the JS trims all whitespace, so use `btrim(x, E' \t\r\n')` as `009` does.
- [ ] **Step 2:** Re-read against `008`/`010`: same grant shapes, every policy dropped before created, no `anon` access.
- [ ] **Step 3: Commit**

```bash
git add backend/supabase/014_community_posts.sql
git commit -m "Community posts: posts, likes and feed (014)"
```

---

### Task 2: Post form rules (TDD)

**Files:**
- Create: `frontend/src/communityPosts.js`, `frontend/src/communityPosts.test.js`

**Interfaces:**
- Consumes: `textLength` (`reviews.js`), `displayName` (`names.js`), `cities` (`cities.js`).
- Produces: `TITLE_MAX = 120`, `BODY_MIN = 20`, `BODY_MAX = 2000`; `postFromForm({ title, cityId, content }, user) → { row: { title, city_id, body, author_name } } | { error: string }`. Checks in order: title, city, post.

- [ ] **Step 1: Failing tests** in `communityPosts.test.js` (user `{ email: 'leila@x.com', user_metadata: { full_name: 'Leila Ben Ali' } }`, valid form `{ title: '  Sunrise at Chebika ', cityId: 'tozeur', content: '  Leave Tozeur at 5am and you get the canyon to yourself. ' }`):
  - `returns the trimmed row` → `{ row: { title: 'Sunrise at Chebika', city_id: 'tozeur', body: 'Leave Tozeur at 5am and you get the canyon to yourself.', author_name: 'Leila Ben Ali' } }`
  - `needs a title`: `'  ab '` → title min message
  - `limits the title`: 120 × `'a'` ok, 121 → title max message
  - `counts an emoji as one character`: `'😀'.repeat(120)` title ok
  - `needs a known city`: `''` and `'atlantis'` → "Please choose a city."
  - `needs 20 characters of post`: 19 × `'a'` padded with spaces → post min message; 20 ok
  - `limits the post`: 2000 ok, 2001 → post max message
  - `checks the title first`: everything empty → title min message
  - `uses the email name when there is no full name` → `author_name: 'leila'`
  - `cuts the author name to 100 characters`
- [ ] **Step 2:** Run `npx vitest run src/communityPosts.test.js` → FAIL (module not found).
- [ ] **Step 3:** Implement `postFromForm` in `communityPosts.js`, shaped like `momentFromForm`.
- [ ] **Step 4:** Run `npx vitest run` → all pass.
- [ ] **Step 5: Commit**

```bash
git add frontend/src/communityPosts.js frontend/src/communityPosts.test.js
git commit -m "Community posts: post form rules"
```

---

### Task 3: Supabase calls

**Files:** Create `frontend/src/communityApi.js`

**Interfaces:**
- Consumes: `supabase` (`supabase.js`), `avatarUrl` (`profileApi.js`).
- Produces (none throw; all return the failure value when `supabase` is null):
  - `fetchFeed() → Promise<Post[] | null>`; `Post = { id, author_name, author_avatar_url, city_id, title, body, created_at, likes: number, liked: boolean, mine: boolean }` (rpc `community_feed`)
  - `createPost(row) → Promise<{ ok: true } | { error }>` (insert into `community_posts`)
  - `updatePost(id, { title, city_id, body }) → Promise<{ ok: true } | { error }>`
  - `deletePost(id) → Promise<{ ok: true } | { error }>`
  - `setPostLike(id, on) → Promise<boolean>`: same as `setMomentLike`, table `community_post_likes`, column `post_id`, duplicate key `23505` counts as saved.
  - Errors: create/update → "Couldn't save your post. Please try again."; delete → "Couldn't delete your post. Please try again."

- [ ] **Step 1:** Write the module, following `momentsApi.js` (header comment, try/catch, plain values). `updatePost` and `deletePost` chain `.eq('id', id).select('id')` and return the error when `data` is empty (Review Focus 3).
- [ ] **Step 2:** `npx vite build` from `frontend/` → builds.
- [ ] **Step 3: Commit**

```bash
git add frontend/src/communityApi.js
git commit -m "Community posts: Supabase calls"
```

---

### Task 4: Signed-in community page

**Files:**
- Modify: `frontend/src/pages/Community.jsx`
- Modify: `frontend/src/styles.css` (only what the new states need)

**Interfaces:**
- Consumes: Task 2 `postFromForm`, `BODY_MIN`; Task 3 functions; `toggleMomentLike` (`moments.js`) for the optimistic like flip (same `likes` / `liked` shape).

- [ ] **Step 1:** Split so `/community` is untouched: when `user` is set, posts come from `fetchFeed()` (loaded on mount and by Try again), mapped to the card fields (`body` → text, `author_name`, `author_avatar_url`, `mine`). The visitor branch keeps `myPosts`, `samplePosts`, `likedIds` and its localStorage writes exactly as now. Structure (one component or a separate signed-in component) is your call.
- [ ] **Step 2:** Signed-in states: "Loading posts…" while loading; on `null` a `cm-card cm-empty` with "Couldn't load posts." and a Try again button; otherwise the feed. City filter, search and the "About the forum" counts use the loaded posts.
- [ ] **Step 3:** Publish / edit: run `postFromForm`; show `error` in the form (`contact__error`, `role="alert"`) and keep it open; while saving, disable Cancel and submit; on success close, reload the feed, toast "Post published" / "Changes saved"; on failure show the API error in the form. Edit opens with the post's title, city and text.
- [ ] **Step 4:** Like: per-post busy set; flip with `toggleMomentLike`, call `setPostLike(id, !liked)`; on `false` flip that post back and toast "Couldn't save your like. Please try again." Button disabled while that post is busy.
- [ ] **Step 5:** Delete: own posts show Edit and Delete in `cm-post__actions`. Delete opens a `Modal` titled "Delete this post?" with Cancel / Delete (disabled while deleting). Success: remove from the list, close, toast "Post deleted". Failure: close and toast the error.
- [ ] **Step 6:** Signed-in cards have no comment count; Share and the ⋯ menu as now.
- [ ] **Step 7:** `npx vitest run` and `npx vite build` → pass.
- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Community.jsx frontend/src/styles.css
git commit -m "Community posts: publish, edit, delete and like on /app/community"
```

---

### Task 5: Checkpoint

**Files:** Modify `CHECKPOINT.md` (write with LF line endings)

- [ ] **Step 1:** Add `014_community_posts.sql` to the SQL list and "Waiting on you" (run after `013`), the spec's manual checks under browser checks, the test count, and a Done row for community posts.
- [ ] **Step 2: Commit**

```bash
git add CHECKPOINT.md
git commit -m "Checkpoint: community posts"
```
