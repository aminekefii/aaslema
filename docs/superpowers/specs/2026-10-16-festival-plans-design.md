# Festivals in the plan — design

Date: 2026-10-16
Status: approved in brainstorming, awaiting spec review

## Goal

Signed-in users add festivals to their plan from `/app/festivals` (an "Add
to plan" toggle on each festival), and the My plan dashboard section shows
two stacked parts: **Destinations** and **Festivals**.

Builds on My plan (`012_city_plans.sql`, `MyPlan.jsx`, `CityListSection`),
`cityActivity.js` and `festivals.js`.

## Decisions

| Question | Decision |
|---|---|
| Festival identity | A fixed `id` per festival in `festivals.js`, written by hand (list below), never derived at runtime |
| Storage | New table `festival_plans`, same shape and rules as `city_plans` |
| Festivals page | Signed-in: "Add to plan" / "✓ In your plan" toggle per festival. Visitors: no buttons, the existing sign-in note |
| My plan layout | Two stacked sections: "Destinations (N)" (photo cards, as now) then "Festivals (N)" (compact cards) |
| Festival card | Name, region, when, "Added 2 days ago"; links to `/app/festivals#<region id>` |
| Removing | Only by clicking "In your plan" again on the festivals page |
| Failures | Each section and the festivals page load on their own; a failure shows a message without hiding the rest |

## Festival ids

| id | Festival |
|---|---|
| `international-festival-of-carthage` | International Festival of Carthage |
| `carthage-film-festival` | Carthage Film Festival (JCC) |
| `carthage-theatre-days` | Carthage Theatre Days (JTC) |
| `jazz-a-carthage` | Jazz à Carthage |
| `oudhna-international-festival-of-popular-arts` | Oudhna International Festival of Popular Arts |
| `ramadan-medina-festival` | Ramadan Medina Festival |
| `international-festival-of-hammamet` | International Festival of Hammamet |
| `orange-blossom-festival-menzel-bouzelfa` | Orange Blossom Festival, Menzel Bouzelfa |
| `cinemajet-zaghouan` | CinemaJet, Zaghouan |
| `tabarka-jazz-festival` | Tabarka Jazz Festival |
| `ghar-el-melh-cultural-days` | Ghar El Melh cultural days |
| `mateur-summer-festival` | Mateur summer festival |
| `beja-international-festival` | Béja International Festival |
| `dougga-festival` | Dougga festival |
| `le-kef-summer-festival` | Le Kef summer festival |
| `siliana-international-festival` | Siliana International Festival |
| `sousse-international-festival` | Sousse International Festival |
| `monastir-international-festival` | Monastir International Festival |
| `monastir-international-arts-festival` | Monastir International Arts Festival (visual arts) |
| `contemporary-dance-festival-monastir` | Contemporary dance festival, Monastir |
| `mahdia-summer-festival` | Mahdia summer festival |
| `sbeitla-festival` | Sbeitla festival |
| `mawlid-celebrations-kairouan` | Mawlid celebrations, Kairouan |
| `sfax-international-festival` | Sfax International Festival |
| `ali-ben-ayed-festival-kerkennah` | Ali Ben Ayed Festival, Kerkennah |
| `djerba-summer-events` | Djerba summer events |
| `gabes-summer-festival` | Gabès summer festival |
| `festival-of-the-oases-tozeur` | Festival of the Oases, Tozeur |
| `tamerza-cultural-days` | Tamerza cultural days |
| `international-festival-of-the-sahara-douz` | International Festival of the Sahara, Douz |
| `ksour-festival-tataouine` | Ksour festival, Tataouine |

## Database

New file `backend/supabase/013_festival_plans.sql`, run once; safe to re-run.

```sql
-- Festivals in each user's plan. Signed-in users manage only their own rows.
-- Safe to re-run, but re-running does not change an existing table.

create table if not exists public.festival_plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  festival_id text not null check (festival_id ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

alter table public.festival_plans enable row level security;

-- Signed-in users add rows (user_id comes from the default), read and delete their own.
revoke all on public.festival_plans from anon, authenticated;
grant select, delete on public.festival_plans to authenticated;
grant insert (festival_id) on public.festival_plans to authenticated;

drop policy if exists "Users read their own festival plan" on public.festival_plans;
create policy "Users read their own festival plan" on public.festival_plans
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users add to their own festival plan" on public.festival_plans;
create policy "Users add to their own festival plan" on public.festival_plans
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users remove from their own festival plan" on public.festival_plans;
create policy "Users remove from their own festival plan" on public.festival_plans
  for delete to authenticated using (user_id = auth.uid());
```

## Shared code

- `festivals.js`: every festival gets `id` (table above). New pure helpers
  (tested): `allFestivals()` → `[{ ...festival, regionId, region }]` in page
  order; `festivalCards(rows, list)` → `[{ id, name, region, regionId, when, at }]`
  for `festival_plans` rows (`festival_id`, `created_at`), skipping unknown ids,
  keeping row order.
- `cityActivity.js`: `fetchMyCityIds(table, column = 'city_id')`,
  `fetchMyCityRows(table, column = 'city_id')` (returns `{ <column>, created_at }`
  rows) and `setCityFlag(table, id, on, column = 'city_id')` take the id
  column; existing calls are unchanged.

## Festivals page (`Festivals.jsx`)

- Signed in (`user` set): loads `fetchMyCityIds('festival_plans', 'festival_id')`
  once. While loading or on failure the buttons are disabled; on failure
  "Couldn't load your plan. Please refresh the page." shows above the list.
- Each festival item gets a button (right side on wide screens, under the
  date on phones): `city-btn` styling, `aria-pressed`, `Calendar` /
  `CheckCircle2` icon, "Add to plan" / "In your plan", disabled while that
  festival saves. Optimistic flip; on failure flip back and show "Couldn't
  save that. Please try again." above the list.
- Visitors: unchanged (sign-in note, no buttons).

## My plan (`MyPlan.jsx`)

- Heading "My plan", then:
  - `<h2>Destinations (N)</h2>` and the existing destination cards
    (`CityListSection` gains a `heading` mode for this: an `h2` with the count
    instead of the page `h1` + count line; Visited destinations keeps its
    current look). Empty: "No destinations in your plan yet."
  - `<h2>Festivals (N)</h2>` and compact festival cards (`.plan-festivals`
    grid, same columns as the destination grid): name (bold), region,
    `CalendarDays` + when, "Added 2 days ago"; the card links to
    `/app/festivals#<regionId>`. Empty: "No festivals in your plan yet."
    with a "Browse festivals" link to `/app/festivals`.
  - Each part shows its own loading ("Loading…") and error ("Couldn't load
    this list." + Try again).
- Document title "My plan - Aaslema".

## Files

| File | Change |
|---|---|
| `backend/supabase/013_festival_plans.sql` | New |
| `frontend/src/festivals.js`, `festivals.test.js` (new) | ids, `allFestivals`, `festivalCards` |
| `frontend/src/cityActivity.js` | id column parameter |
| `frontend/src/pages/Festivals.jsx` | Add to plan per festival |
| `frontend/src/sections/CityListSection.jsx` | `heading` mode |
| `frontend/src/sections/PlanFestivals.jsx` (new) | Festivals part of My plan |
| `frontend/src/pages/MyPlan.jsx` | Two stacked parts |
| `frontend/src/styles.css` | Festival button and cards |

## Testing

- **Automated (Vitest):** `festivals.test.js`: every festival has an id
  matching `^[a-z0-9-]{1,60}$`, ids are unique, `allFestivals` keeps page order
  and adds the region; `festivalCards` maps rows, skips unknown ids, keeps order.
- **Manual (owner):**
  1. Run `013_festival_plans.sql`.
  2. Signed in on `/app/festivals`: "Add to plan" on Jazz à Carthage → "In
     your plan"; reload keeps it; click again removes it.
  3. Add a destination and two festivals → My plan shows "Destinations (1)"
     and "Festivals (2)"; a festival card opens `/app/festivals#greater-tunis`.
  4. Visitors on `/festivals`: no buttons, sign-in note.
  5. Before `013` is run: festivals page shows the plan load error and
     disabled buttons; My plan's Destinations part still works.

## Future work

- Dates for festivals, reminders, festivals linked to destinations.
