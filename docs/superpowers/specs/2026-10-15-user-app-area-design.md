# User app area — design

Date: 2026-10-15
Status: approved in brainstorming, awaiting spec review

## Goal

After signing in, a user gets their own area of the site (`/app`) with a top
navbar for everything they can do: Home (feed), Destinations, Festivals,
Community, Contact, AI Planner, Profile, and Sign Out. The public site stays a
it is for visitors.

This spec covers **part 1 of 4**: the app area shell (layout, navbar, routing,
redirects). Feed, AI Planner and Profile are placeholder pages here; they get
their own specs later (see Future work).

## Decisions

| Question | Decision |
|---|---|
| Separate area or same site? | Separate app area under `/app` |
| Existing pages in the app | Same page components, rendered inside the app layout |
| Navbar style | Top bar, like the current public header |
| Signed-in user on a public URL | Redirected to the app equivalent |
| Routing | Extend the existing path switch in `App.jsx` (no router library) |
| `/faq` | Stays public only; not in the app |

## URLs

| URL | Shows |
|---|---|
| `/app` | Feed placeholder (`AppHome`) |
| `/app/destinations` | `Destinations` |
| `/app/destinations/<city>` | `CityDetail` |
| `/app/festivals` | `Festivals` |
| `/app/community` | `Community` |
| `/app/contact` | `Contact` |
| `/app/planner` | AI Planner placeholder (`Planner`) |
| `/app/profile` | Profile placeholder (`Profile`) |
| any other `/app/...` | redirect to `/app` |

## Redirect rules

Decided by one pure function in `src/redirects.js` (kept apart from
`route.js`, which reads `window` at import time, so it can be unit-tested in
Node): `redirectFor(path, signedIn)` returns the URL to go to, or `null` to stay.
`path` is the pathname without a trailing slash (`currentPath`).

Signed out:
- `/app` or `/app/...` → `/signin`
- everything else → `null`

Signed in:
- `''` (landing), `/signin`, `/signup` → `/app`
- `/destinations` → `/app/destinations`; `/destinations/<city>` → `/app/destinations/<city>`
- `/festivals`, `/community`, `/contact` → same path under `/app`
- `/app/...` that is not in the URL table above → `/app`
- `/reset-password`, `/faq`, known `/app` URLs, anything else → `null`

`/reset-password` must never redirect: the reset email link signs the user in
before they have set the new password.

Redirects use `window.location.replace` so the redirected-from URL does not sit
in browser history (Back does not bounce the user forward again).

The hash is not preserved; only the landing page uses hashes and it redirects
to `/app`.

## Session loading

`useUser()` returns `undefined` while Supabase reads the saved session. During
that time `App` renders nothing (no header, page or footer), so the wrong page
never flashes before a redirect. Once the user is known (`null` or a user),
`App` applies `redirectFor`, and renders only when it returns `null`.

`App` keeps listening via `useUser()`, so if the session ends while on an
`/app` page (sign out in another tab, expiry), the rule re-runs and sends the
user to `/signin`.

When Supabase is not configured (`supabase === null`), `useUser()` is `null`
immediately: the user counts as signed out and `/app` goes to `/signin`, which
already shows "Accounts aren't connected yet".

## Components and files

### New

- `src/sections/AppHeader.jsx` — app top bar.
  - Logo → `/app`.
  - Links from `appNavLinks`: Home, Destinations, Festivals, Community,
    Contact, AI Planner. Active link: exact match, or prefix match for
    sections with sub-pages (`/app/destinations/...`). Home is active only on
    `/app` exactly.
  - Right side: user chip (initials avatar + `full_name` or email) linking to
    `/app/profile`, Sign Out button, existing `Switcher`, mobile menu toggle.
  - Reuses the existing `header`, `nav`, `header__actions`, `menu-toggle`
    classes and the `header--solid` look so it matches the public header; the
    phone menu behaves the same way.
  - Sign Out calls `onSignOut` from `App`. `App` sets a `signingOut` flag
    (so the signed-out redirect to `/signin` does not race the sign-out
    navigation), awaits `supabase.auth.signOut()` (supabase-js clears the
    local session even when the server call fails), then
    `window.location.assign('/')`.
  - `App` passes `user` to `AppHeader` and to app pages as a prop, so there
    is one session subscription.
- `src/pages/AppHome.jsx` — "Your feed is coming soon", one line about posts
  from travellers, button to `/app/community`.
- `src/pages/Planner.jsx` — "AI Planner is coming soon", one line, button to
  `/app/destinations`.
- `src/pages/Profile.jsx` — shows the user's name and email; "Editing your
  profile is coming soon".
- Each placeholder sets `document.title` like the other pages do.

### Changed

- `src/App.jsx`
  - Add an `appPages` table for the `/app` URLs, alongside `pages`.
  - City detail matches `^/(?:app/)?destinations/([^/]+)$`.
  - Render `AppHeader` for `/app` paths, `Header` otherwise.
  - Session loading and redirect behaviour as above.
  - Footer stays on all pages.
- `src/redirects.js` (new) — `isAppPath(path)` (`path === '/app' ||
  path.startsWith('/app/')`) and `redirectFor(path, signedIn)`.
- `src/route.js` — `export const base = isAppPath(currentPath) ? '/app' : ''`.
- `src/pages/Destinations.jsx`, `src/pages/CityDetail.jsx` — the three
  internal `/destinations...` links become `` `${base}/destinations...` ``.
- `src/pages/Auth.jsx` — after successful sign in / sign up (session
  returned), go to `/app` instead of `/`. Password-reset success still goes to
  `/`, which then redirects to `/app`.
- `src/data.js` — add `appNavLinks` next to `navLinks`.
- `src/styles.css` — user chip/avatar and placeholder page styles.
- `package.json` — `vitest` dev dependency and `"test": "vitest run"` script.

### Not touched

Landing page sections, `Faq`, `Switcher`, `supabase.js`, nginx config (it
already falls back to `index.html` for every path).

`Header.jsx` keeps its signed-in branch (name + Sign Out): signed-in users
still see the public header on the two public pages they can reach, `/faq` and
`/reset-password`.

## Testing

- **Unit (Vitest):** `src/route.test.js` covers `redirectFor` for every rule
  above, signed in and out, including `/reset-password`, `/faq`, unknown
  `/app/...` paths, and `/destinations/<city>`.
- **Manual, in the browser:**
  1. Signed out, open `/app` → lands on `/signin`.
  2. Sign in → lands on `/app` with the app navbar.
  3. Each navbar link opens the right page and is highlighted.
  4. Destinations → click a city → URL stays under `/app/destinations/...`;
     "Back to destinations" stays in `/app`.
  5. Open `/`, `/destinations`, `/signin` while signed in → redirected into `/app`.
  6. `/faq` and `/reset-password` load without redirect while signed in.
  7. Phone width: menu toggle opens and closes the links.
  8. Sign Out → lands on `/` with the public header.
- `npm run build` passes.

## Future work (separate specs)

1. **Feed + real posts:** store Community posts in Supabase (table + row
   level security) so `/app` shows a real feed from all users.
2. **Profile:** edit name and avatar, list the user's own posts.
3. **AI Planner:** needs an AI provider and a backend endpoint.
4. **React Router:** switch from the path switch to React Router (nested
   layouts, no full page reloads) if the app keeps growing.
