# Festivals in the Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users add festivals to their plan from `/app/festivals`; My plan shows two stacked parts, Destinations and Festivals.

**Architecture:** Fixed ids on each festival in `festivals.js`; `013_festival_plans.sql` copies the `city_plans` pattern; `cityActivity.js` functions take the id column; `Festivals.jsx` gets per-festival toggles; `MyPlan.jsx` stacks `CityListSection` (new heading mode) and a new `PlanFestivals`.

**Tech Stack:** React 18 + Vite, Supabase, Vitest, lucide-react 0.460.

**Spec:** `docs/superpowers/specs/2026-10-16-festival-plans-design.md`

## Global Constraints

- Festival ids exactly as the spec's table; `^[a-z0-9-]{1,60}$`; unique.
- SQL `backend/supabase/013_festival_plans.sql`; safe to re-run.
- Visitors: no buttons (sign-in note stays). Removing only via the toggle on the festivals page.
- Copy (exact): "Add to plan", "In your plan", "Couldn't load your plan. Please refresh the page.", "Couldn't save that. Please try again.", "My plan", "Destinations (N)", "Festivals (N)", "No destinations in your plan yet.", "No festivals in your plan yet.", "Browse festivals", "Added", "Loading…", "Couldn't load this list.", "Try again".
- Each part / page loads on its own; one failure never hides the other.
- Existing `cityActivity` calls keep working unchanged (column defaults to `city_id`).
- Tests: Vitest, pure functions; from `frontend/`: `npx vitest run`. Style: 2-space indent, no semicolons, single quotes.

## Review Focus

1. Before `013` is run: festivals page shows the load error, buttons disabled; My plan's Destinations part still works, Festivals part shows its own error. Pinned in Tasks 3–4 (separate loads) and manual check 5.
2. Two quick clicks on different festivals both save and both show; a failed one flips back alone. Pinned by per-id `busy` and functional state updates in Task 3.
3. Visitors never see plan buttons. Pinned by `user &&` in Task 3.
4. Visited destinations keeps its exact look after the `heading` mode is added. Pinned in Task 4 (default branch unchanged).
5. A festival removed from `festivals.js` later doesn't crash My plan. Pinned by the "skips unknown ids" test in Task 2.

---

### Task 1: SQL `festival_plans`

**Files:** Create `backend/supabase/013_festival_plans.sql`

- [ ] **Step 1:** Create the file with exactly the spec's SQL block.
- [ ] **Step 2:** Compare with `012_city_plans.sql` (same grants and policy shapes; `festival_id` with `{1,60}`).
- [ ] **Step 3: Commit**

```bash
git add backend/supabase/013_festival_plans.sql
git commit -m "Festival plans: festival_plans table (013)"
```

---

### Task 2: Festival ids and helpers (TDD); id column in `cityActivity`

**Files:**
- Modify: `frontend/src/festivals.js` (ids; helpers at the end)
- Create: `frontend/src/festivals.test.js`
- Modify: `frontend/src/cityActivity.js`

**Interfaces:**
- Produces: `allFestivals() → [{ id, name, when, note?, regionId, region }]`; `festivalCards(rows, list) → [{ id, name, region, regionId, when, at }]`; `fetchMyCityIds(table, column = 'city_id')`, `fetchMyCityRows(table, column = 'city_id')` (rows `{ [column], created_at }`), `setCityFlag(table, id, on, column = 'city_id')`.

- [ ] **Step 1: Failing tests** — create `frontend/src/festivals.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { allFestivals, festivalCards, festivalRegions } from './festivals.js'

describe('festival ids', () => {
  const all = allFestivals()

  it('gives every festival a well-formed id', () => {
    for (const f of all) expect(f.id).toMatch(/^[a-z0-9-]{1,60}$/)
  })

  it('never repeats an id', () => {
    expect(new Set(all.map((f) => f.id)).size).toBe(all.length)
  })
})

describe('allFestivals', () => {
  it('lists every festival in page order with its region', () => {
    const all = allFestivals()
    expect(all).toHaveLength(festivalRegions.reduce((n, r) => n + r.festivals.length, 0))
    expect(all[0]).toMatchObject({ id: 'international-festival-of-carthage', regionId: 'greater-tunis', region: 'Greater Tunis' })
  })
})

describe('festivalCards', () => {
  const list = [
    { id: 'jazz-a-carthage', name: 'Jazz à Carthage', when: 'April', regionId: 'greater-tunis', region: 'Greater Tunis' },
    { id: 'dougga-festival', name: 'Dougga festival', when: 'July', regionId: 'north', region: 'North and Northwest' },
  ]

  it('maps plan rows to cards, keeping the order given', () => {
    const rows = [{ festival_id: 'dougga-festival', created_at: '2026-10-16T10:00:00Z' }, { festival_id: 'jazz-a-carthage', created_at: '2026-10-01T10:00:00Z' }]
    expect(festivalCards(rows, list)).toEqual([
      { id: 'dougga-festival', name: 'Dougga festival', region: 'North and Northwest', regionId: 'north', when: 'July', at: '2026-10-16T10:00:00Z' },
      { id: 'jazz-a-carthage', name: 'Jazz à Carthage', region: 'Greater Tunis', regionId: 'greater-tunis', when: 'April', at: '2026-10-01T10:00:00Z' },
    ])
  })

  it('skips festivals that no longer exist', () => {
    expect(festivalCards([{ festival_id: 'gone', created_at: '2026-10-16T10:00:00Z' }], list)).toEqual([])
  })
})
```

Run (in `frontend/`): `npx vitest run src/festivals.test.js` — Expected: FAIL (`allFestivals` is not a function).

- [ ] **Step 2: Ids** — in `frontend/src/festivals.js` add `id: '<id>', ` as the first key of every festival object, using the spec's table (match by `name`). Use a small one-off script that maps name → id from the spec table and asserts all 31 were set; do not hand-type 31 edits.

- [ ] **Step 3: Helpers** — append to `frontend/src/festivals.js`:

```js
// Every festival with its region, in page order (plans look festivals up by id)
export const allFestivals = () =>
  festivalRegions.flatMap((r) => r.festivals.map((f) => ({ ...f, regionId: r.id, region: r.region })))

// festival_plans rows (newest first) → My plan cards; ids no longer in the list are skipped
export function festivalCards(rows, list) {
  return rows.flatMap((row) => {
    const f = list.find((x) => x.id === row.festival_id)
    return f ? [{ id: f.id, name: f.name, region: f.region, regionId: f.regionId, when: f.when, at: row.created_at }] : []
  })
}
```

Run: `npx vitest run src/festivals.test.js` — Expected: PASS.

- [ ] **Step 4: id column** — in `frontend/src/cityActivity.js`:
  - `fetchMyCityIds(table)` → `fetchMyCityIds(table, column = 'city_id')`; `.select('city_id')` → `.select(column)`; `.map((row) => row.city_id)` → `.map((row) => row[column])`.
  - `fetchMyCityRows(table)` → `fetchMyCityRows(table, column = 'city_id')`; `.select('city_id, created_at')` → `` .select(`${column}, created_at`) ``; its comment mentions festival_plans too.
  - `setCityFlag(table, cityId, on)` → `setCityFlag(table, cityId, on, column = 'city_id')`; `.insert({ city_id: cityId })` → `.insert({ [column]: cityId })`; `.eq('city_id', cityId)` → `.eq(column, cityId)`.
  - Comment above `fetchMyCityIds`: add "; `column` is festival_id for festival_plans".

- [ ] **Step 5:** `npx vitest run` then `npx vite build` — all PASS; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/festivals.js frontend/src/festivals.test.js frontend/src/cityActivity.js
git commit -m "Festival plans: festival ids, plan helpers and id column"
```

---

### Task 3: Add to plan on the festivals page

**Files:** Modify `frontend/src/pages/Festivals.jsx`, `frontend/src/styles.css`

- [ ] **Step 1: Imports and state** — imports become:

```jsx
import { useEffect, useState } from 'react'
import { Calendar, CalendarDays, CheckCircle2 } from 'lucide-react'
import { festivalRegions } from '../festivals.js'
import { fetchMyCityIds, setCityFlag } from '../cityActivity.js'
import { toggleId } from '../cityCounts.js'
```

At the top of `Festivals({ user })`, before the title effect:

```jsx
  // Festival ids in the user's plan: undefined while loading, null if loading failed
  const [planned, setPlanned] = useState(undefined)
  // Festivals being saved; each button waits only for its own save
  const [busy, setBusy] = useState([])
  const [saveError, setSaveError] = useState(false)
  const userId = user?.id
```

After the title effect:

```jsx
  useEffect(() => {
    setPlanned(undefined)
    if (!userId) return
    let current = true
    fetchMyCityIds('festival_plans', 'festival_id').then((ids) => { if (current) setPlanned(ids) })
    return () => { current = false }
  }, [userId])

  // Flip right away; flip back if saving fails
  const togglePlan = async (festivalId) => {
    const on = !planned.includes(festivalId)
    setSaveError(false)
    setBusy((b) => [...b, festivalId])
    setPlanned((p) => toggleId(p, festivalId, on))
    const saved = await setCityFlag('festival_plans', festivalId, on, 'festival_id')
    if (!saved) {
      setPlanned((p) => p && toggleId(p, festivalId, !on))
      setSaveError(true)
    }
    setBusy((b) => b.filter((id) => id !== festivalId))
  }
```

- [ ] **Step 2: Notes** — right after the visitor sign-in note block, add:

```jsx
          {user && planned === null && (
            <p className="city-note city-note--error fest__plan-note" role="alert">Couldn't load your plan. Please refresh the page.</p>
          )}
          {saveError && <p className="city-note city-note--error fest__plan-note" role="alert">Couldn't save that. Please try again.</p>}
```

- [ ] **Step 3: Buttons** — replace the festival list item with:

```jsx
                {r.festivals.map((f) => {
                  const inPlan = Array.isArray(planned) && planned.includes(f.id)
                  return (
                    <li key={f.id} className={`fest-item ${user ? 'fest-item--plannable' : ''}`}>
                      <h3>{f.name}</h3>
                      <div className="fest-item__when">
                        <span><CalendarDays size={15} /> {f.when}</span>
                        {f.note && <small>{f.note}</small>}
                      </div>
                      {user && (
                        <button
                          type="button"
                          onClick={() => togglePlan(f.id)}
                          disabled={!Array.isArray(planned) || busy.includes(f.id)}
                          aria-pressed={inPlan}
                          className={`city-btn fest-item__plan ${inPlan ? 'city-btn--soft' : ''}`}
                        >
                          {inPlan ? <CheckCircle2 size={16} /> : <Calendar size={16} />}
                          {inPlan ? 'In your plan' : 'Add to plan'}
                        </button>
                      )}
                    </li>
                  )
                })}
```

- [ ] **Step 4: Styles** — after `.fest-item__when small { … }` add:

```css
/* Signed-in: a third column for the plan button (city-btn is styled for the dark hero, so recolour it) */
.fest-item--plannable { grid-template-columns: 1fr 240px auto; align-items: center; }
.fest-item__plan { border-color: var(--border); color: var(--title); padding: 7px 14px; font-size: 14px; white-space: nowrap; }
.fest-item__plan.city-btn--soft { border-color: transparent; color: var(--primary); }
.fest-item__plan:disabled { opacity: 0.6; cursor: default; }
.fest__plan-note { margin: 0 0 20px; }
```

and inside the existing mobile rule that has `.fest-item { grid-template-columns: 1fr; }`, add `  .fest-item--plannable { grid-template-columns: 1fr; }` and `  .fest-item__plan { justify-self: start; }`.

- [ ] **Step 5:** `npx vitest run` then `npx vite build` — all PASS; build succeeds.
- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Festivals.jsx frontend/src/styles.css
git commit -m "Festival plans: Add to plan on the festivals page"
```

---

### Task 4: My plan split into Destinations and Festivals; checkpoint

**Files:**
- Modify: `frontend/src/sections/CityListSection.jsx` (heading mode)
- Create: `frontend/src/sections/PlanFestivals.jsx`
- Modify: `frontend/src/pages/MyPlan.jsx` (whole file)
- Modify: `frontend/src/styles.css`, `CHECKPOINT.md`

- [ ] **Step 1: Heading mode** — in `CityListSection.jsx`:
  - Signature: `({ table, title, heading, countText, emptyText, dateLabel })`; comment line: "With `heading`, it is one part of a page: an h2 with the count instead of the page h1 and count line."
  - Title effect body: `if (title) document.title = \`${title} - Aaslema\``.
  - Replace `<h1>{title}</h1>` and the count line with:

```jsx
      {heading
        ? <h2 className="plan-part__title">{heading}{items ? ` (${items.length})` : ''}</h2>
        : <h1>{title}</h1>}
      {!heading && items && <p className="profile-card__lead">{countText(items.length)}</p>}
```

- [ ] **Step 2: Festivals part** — create `frontend/src/sections/PlanFestivals.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { fetchMyCityRows } from '../cityActivity.js'
import { allFestivals, festivalCards } from '../festivals.js'
import { timeAgo } from '../timeAgo.js'

// My plan: festivals the user added on the festivals page, newest first; each card opens its region.
export default function PlanFestivals() {
  // undefined while loading, null if loading failed
  const [items, setItems] = useState(undefined)

  const load = useCallback(async () => {
    setItems(undefined)
    const rows = await fetchMyCityRows('festival_plans', 'festival_id')
    setItems(rows && festivalCards(rows, allFestivals()))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <h2 className="plan-part__title">Festivals{items ? ` (${items.length})` : ''}</h2>
      {items === undefined && <p className="profile-note">Loading…</p>}
      {items === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load this list.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {items?.length === 0 && (
        <p className="profile-note">No festivals in your plan yet. <a href="/app/festivals">Browse festivals</a></p>
      )}
      {items?.length > 0 && (
        <div className="my-moments">
          {items.map((f) => (
            <a key={f.id} href={`/app/festivals#${f.regionId}`} className="my-moment">
              <div className="my-moment__body">
                <strong>{f.name}</strong>
                <p className="my-moment__title">{f.region}</p>
                <p className="my-moment__spot"><CalendarDays size={12} /> {f.when}</p>
                <time dateTime={f.at} className="my-moment__footer">Added {timeAgo(f.at).replace('Just now', 'just now')}</time>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: My plan** — replace `frontend/src/pages/MyPlan.jsx` with:

```jsx
import { useEffect } from 'react'
import CityListSection from '../sections/CityListSection.jsx'
import PlanFestivals from '../sections/PlanFestivals.jsx'

// Profile dashboard: the user's plan in two parts, destinations (Add to plan on a destination page)
// and festivals (Add to plan on the festivals page).
export default function MyPlan() {
  useEffect(() => {
    document.title = 'My plan - Aaslema'
  }, [])

  return (
    <>
      <h1>My plan</h1>
      <section className="plan-part">
        <CityListSection table="city_plans" heading="Destinations" emptyText="No destinations in your plan yet." dateLabel="Added" />
      </section>
      <section className="plan-part">
        <PlanFestivals />
      </section>
    </>
  )
}
```

- [ ] **Step 4: Styles** — after `.my-moment__title { … }` add:

```css
.plan-part + .plan-part { margin-top: 36px; }
.plan-part__title { margin: 0 0 4px; color: var(--title); font-size: 22px; }
```

- [ ] **Step 5:** `npx vitest run` then `npx vite build` — all PASS; build succeeds.

- [ ] **Step 6: Checkpoint** (write with LF line endings; check `git diff --cached --stat` shows only real lines): header; test count; SQL `001`–`013`, add `013_festival_plans.sql` to the applied list and the run order; spec manual list; Done row "Festivals in the plan: Add to plan on `/app/festivals`; My plan split into Destinations and Festivals (`013_festival_plans.sql`)" | `2026-10-16-festival-plans` | commits; remove Next item "Festivals in the plan" and renumber.

- [ ] **Step 7: Commit**

```bash
git add frontend/src CHECKPOINT.md
git commit -m "Festival plans: My plan shows Destinations and Festivals"
```
