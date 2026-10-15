# Destination likes and visits — design

Date: 2026-10-15
Status: approved in brainstorming, awaiting spec review

## Goal

Signed-in users can like a destination and mark it as visited. Likes are
shared: every card and city page shows the real number of likes from all
users. Visits are personal: a visited destination shows "Visited" on its
image (blurred on the Destinations page), and the city page's button reads
"Visited". Both are stored in Supabase so they follow the account across
devices.

"Add to plan" is out of scope (it stays in the browser until the AI
Planner work).

## Decisions

| Question | Decision |
|---|---|
| Who can like / mark visited | Signed-in users only; everyone sees like counts |
| Signed-out click | Short note "Sign in to like and track your visits" + sign-in link |
| Storage | One row per (user, city) in `city_likes` / `city_visits` |
| Like counts | `public.city_like_counts()` returns only numbers per city, callable by anyone |
| Old browser-stored likes/visits | Not migrated; counts start fresh |
| City data | Stays in `frontend/src/cities.js`; tables store the city `id` string |

## Database

New file `backend/supabase/004_city_likes_visits.sql`, run once in the
Supabase SQL Editor (after 001–003); safe to re-run.

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

Notes:
- Clients insert only `city_id`; `user_id` always comes from the session
  (`default auth.uid()`), and the policy rejects anything else.
- No update grant: rows are only added or removed.
- The `city_id` format check stops junk values; ids not in `cities.js`
  could still be inserted by a direct API call but are never shown
  (harmless).
- Visits are never counted publicly.

## Frontend

### `src/cityCounts.js` (pure, tested)

- `countsFromRows(rows)` — `[{ city_id, likes }]` → `{ [city_id]: Number(likes) }`
  (Supabase returns `bigint` as a number or string; always convert).
- `likeCount(counts, cityId)` — `counts?.[cityId] ?? 0`.
- `adjustCount(counts, cityId, delta)` — new object with that city's count
  changed by `delta`, never below 0; other cities unchanged.
- `toggleId(ids, cityId, on)` — new array with `cityId` added (once) or
  removed.

### `src/cityActivity.js` (Supabase calls)

None of these throw; each returns a plain value as described:

- `fetchLikeCounts()` — `supabase.rpc('city_like_counts')` → counts map via
  `countsFromRows`; `{ counts: null }` on error or when Supabase isn't
  configured.
- `fetchMyCityIds(table)` — `supabase.from(table).select('city_id')` (RLS
  limits it to the user's rows) → array of ids; `[]` on error. `table` is
  `'city_likes'` or `'city_visits'`.
- `setCityFlag(table, cityId, on)` — `on`: `insert({ city_id: cityId })`
  (a duplicate-key error, code `23505`, counts as success); off:
  `delete().eq('city_id', cityId)` (RLS limits it to the user's row).
  Returns `true` on success, `false` on failure.

### Destinations page (`src/pages/Destinations.jsx`)

- Receives `user` from `App` (already passed to every page).
- On mount: `fetchLikeCounts()`; if `user`, also
  `fetchMyCityIds('city_visits')`.
- Card like count: `likeCount(counts, city.id)` once counts are loaded;
  blank (no number) while loading or if loading failed.
- Visited card: class `guide-card--visited` → image `filter: blur(3px)
  brightness(0.75)`, plus a centred overlay "✓ Visited"
  (`guide-card__visited`, with the check as a lucide `CheckCircle2` icon).
  The card's link gets `aria-label="{name}, visited"` context via a
  visually hidden "(visited)" text.
- The static `city.likes` value in `cities.js` is no longer used for display.

### City page (`src/pages/CityDetail.jsx`)

- `App.jsx` must pass `user` to it: the city route becomes
  `(props) => <CityDetail id={cityId} {...props} />`.
- On mount: `fetchLikeCounts()`; if `user`, `fetchMyCityIds('city_likes')`
  and `fetchMyCityIds('city_visits')` to set `hasLiked` / `isVisited`.
- Like button: `{hasLiked ? 'Liked' : 'Like'} · {count}` where count is
  `likeCount(counts, id)` (shows `·` with no number until loaded).
- Click (signed in): disable the button, flip the state and adjust the
  count immediately, call `setCityFlag`; on failure flip back, restore the
  count and show "Couldn't save that. Please try again." under the
  buttons. Same for Mark as visited (no count).
- Click (signed out): show "Sign in to like and track your visits." with a
  link to `/signin`, under the buttons; nothing is saved.
- When visited: the hero image gets a "✓ Visited" label
  (`city-hero__visited`) over it, no blur. The `<img className="city-hero__image">`
  is wrapped in `<div className="city-hero__media">` (relative
  positioning); the `.city-hero__grid > img` mobile `order: -1` rule moves
  to `.city-hero__grid > .city-hero__media`.
- The old `liked_cities` / `visited_cities` localStorage reads and writes
  are removed. `planned_cities` (Add to plan) and moments stay as they are.

### Styles (`src/styles.css`)

`guide-card--visited`, `guide-card__visited`, `city-hero__media`,
`city-hero__visited`, `city-note` (the sign-in / error note under the
buttons), using existing colour variables.

## Files

New: `backend/supabase/004_city_likes_visits.sql`, `frontend/src/cityCounts.js`
+ test, `frontend/src/cityActivity.js`.
Changed: `frontend/src/pages/Destinations.jsx`, `frontend/src/pages/CityDetail.jsx`,
`frontend/src/App.jsx`, `frontend/src/styles.css`, `backend/README.md` (step 4).

## Testing

- **Vitest:** `cityCounts.test.js` — rows to map (string and number
  `likes`, empty list), `likeCount` for missing city / null counts,
  `adjustCount` (+1, −1, never below 0, other cities untouched, input not
  mutated), `toggleId` (add, no duplicate, remove, input not mutated).
- **SQL:** checked by reading; the owner runs it.
- **Manual (owner), after running `004_city_likes_visits.sql`:**
  1. Signed out, `/destinations` shows counts (0 everywhere at first); on a
     city page, Like shows the sign-in note.
  2. Signed in as user A, like Tozeur → "Liked · 1"; back on Destinations
     the Tozeur card shows 1.
  3. Signed in as user B, like Tozeur → 2; unlike → 1.
  4. Mark Tozeur visited as A → the button reads "Visited", the hero image
     shows "✓ Visited"; on Destinations the Tozeur card is blurred with
     "✓ Visited". User B does not see it as visited.
  5. Refresh and sign in on another browser as A → likes and visits are
     still there.
  6. With the network offline in dev tools, click Like → it flips back and
     shows the error note.
  7. In the SQL Editor: `set role anon; select * from public.city_likes;` →
     "permission denied"; `select * from public.city_like_counts();` →
     counts; `reset role;`.

## Future work

- Add to plan in Supabase (with the AI Planner).
- "Places I've visited" list on the Profile page.
