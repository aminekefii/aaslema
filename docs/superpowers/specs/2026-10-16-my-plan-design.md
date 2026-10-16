# My plan (Add to plan) — design

Date: 2026-10-16
Status: approved in brainstorming, awaiting spec review

## Goal

"Add to plan" on a destination page really saves the destination to the
signed-in user's plan (a personal list of places to visit), and a new
**My plan** section in the profile dashboard lists them. Replaces the
"Coming soon" popup.

Builds on the likes/visits pattern (`004_city_likes_visits.sql`,
`cityActivity.js`, `CityDetail.jsx` `toggleFlag`) and the Visited
destinations section (`VisitedDestinations.jsx`, `visitedCards`).

## Decisions

| Question | Decision |
|---|---|
| What a plan is | One personal list of destinations, saved in Supabase |
| Adding / removing | "Add to plan" toggles: click adds ("In your plan"), click again removes; only on the destination page |
| Dashboard | "My plan" lists the destinations, view only; a card opens the destination |
| Visitors | Unchanged: "Sign in to like, plan and track your visits." |
| Marking visited | Does not touch the plan |
| Sidebar order | My moments, My plan, Visited destinations, Edit profile, Rate your trip |

## Database

New file `backend/supabase/012_city_plans.sql`, run once after `004`; safe to re-run.

```sql
-- Destination plans: each user's personal list of places to visit. Signed-in users manage
-- only their own rows. Safe to re-run, but re-running does not change an existing table.

create table if not exists public.city_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

alter table public.city_plans enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.city_plans from anon, authenticated;
grant select, delete on public.city_plans to authenticated;
grant insert (city_id) on public.city_plans to authenticated;

drop policy if exists "Users read their own plan" on public.city_plans;
create policy "Users read their own plan" on public.city_plans
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users add to their own plan" on public.city_plans;
create policy "Users add to their own plan" on public.city_plans
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users remove from their own plan" on public.city_plans;
create policy "Users remove from their own plan" on public.city_plans
  for delete to authenticated using (user_id = auth.uid());
```

## Shared code

- `cityCounts.js`: `visitedCards(rows, cityList)` is renamed `myCityCards`
  and its date field `visitedAt` becomes `at` (used by both sections).
- `cityActivity.js`: `fetchMyVisits()` becomes `fetchMyCityRows(table)`
  (`city_visits` or `city_plans`), same query (`city_id, created_at`,
  newest first), `null` on failure.

## Destination page (`CityDetail.jsx`)

- New state `isInPlan`, `planBusy`, `planLoaded`.
- On load (signed in) the user's plan ids are fetched alongside likes and
  visits but handled separately: if likes/visits fail the existing
  "Couldn't load your likes and visits…" note shows; if only the plan fails,
  the plan button stays disabled and the note "Couldn't load your plan.
  Please refresh the page." shows (so a missing `012` doesn't break likes
  and visits).
- `handleAddToPlan = () => toggleFlag('city_plans', isInPlan, setIsInPlan, setPlanBusy, false)`
  (visitors get the sign-in note from `toggleFlag`).
- Button: `disabled={planBusy || (user && !planLoaded)}`, `aria-pressed`,
  `city-btn--soft` when in the plan; icon `CheckCircle2` / `Calendar`;
  text "In your plan" / "Add to plan".
- The "Coming soon" plan modal, `showPlanModal` and the `.soon-card` CSS are removed.

## Profile dashboard

- `redirects.js` `appPagePaths` gains `/app/profile/plan`; `App.jsx` routes
  it to `inProfile(MyPlan)`; `data.js` `profileNavLinks` gets
  `['My plan', '/app/profile/plan']` after My moments; `ProfileLayout`
  icon `Calendar`.
- `VisitedDestinations.jsx` becomes a small shared component
  `CityListSection({ table, title, countText, emptyText, dateLabel })` in
  `src/sections/CityListSection.jsx`; `pages/VisitedDestinations.jsx` and
  new `pages/MyPlan.jsx` render it:
  - Visited: title "Visited destinations", count "N of 24 destinations
    visited", empty "You haven't marked any destinations as visited yet.",
    date label "Visited".
  - My plan: title "My plan", count "N destinations in your plan" ("1
    destination in your plan"), empty "Your plan is empty. Open a destination
    and click Add to plan.", date label "Added".
  - Loading "Loading…", error "Couldn't load this list." + Try again,
    empty text + "Explore destinations" link; document title from `title`.

## Files

| File | Change |
|---|---|
| `backend/supabase/012_city_plans.sql` | New |
| `frontend/src/cityCounts.js`, `cityCounts.test.js` | `visitedCards` → `myCityCards` (`at`) |
| `frontend/src/cityActivity.js` | `fetchMyVisits` → `fetchMyCityRows(table)` |
| `frontend/src/sections/CityListSection.jsx` | New (shared list) |
| `frontend/src/pages/VisitedDestinations.jsx` | Uses `CityListSection` |
| `frontend/src/pages/MyPlan.jsx` | New |
| `frontend/src/pages/CityDetail.jsx` | Real Add to plan; popup removed |
| `frontend/src/App.jsx`, `data.js`, `redirects.js`, `redirects.test.js`, `sections/ProfileLayout.jsx` | Path and sidebar |
| `frontend/src/styles.css` | `.soon-card` removed |

## Testing

- **Automated (Vitest):** `cityCounts.test.js` for `myCityCards` (order,
  skipping unknown ids, `at`); `redirects.test.js`: `/app/profile/plan` is a
  signed-in app page.
- **Manual (owner):**
  1. Run `012_city_plans.sql`.
  2. Signed in on `/app/destinations/tozeur`: "Add to plan" → "In your plan";
     reload → still "In your plan"; click again → "Add to plan".
  3. Add Tozeur and Djerba → My plan shows both, newest first, "2
     destinations in your plan"; a card opens the destination.
  4. Sign in on another browser → same plan.
  5. Signed out: "Add to plan" shows the sign-in note.
  6. Visited destinations still works as before.
  7. Before `012` is run: likes and visits still load; the plan button is
     disabled with "Couldn't load your plan. Please refresh the page.".

## Future work

- Several named trips, dates and notes; remove from the dashboard; the AI
  Planner using the plan.
