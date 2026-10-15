# User App Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give signed-in users their own area under `/app` with a top navbar (Home, Destinations, Festivals, Community, Contact, AI Planner, Profile, Sign Out), and keep visitors on the public site.

**Architecture:** The existing path switch in `App.jsx` gains an `/app` page table and picks `AppHeader` or the public `Header` by URL. A pure `redirectFor(path, signedIn)` in `src/redirects.js` decides all redirects and is unit-tested with Vitest. Existing pages are reused inside the app; their internal links use a `base` prefix from `route.js`.

**Tech Stack:** React 18, Vite 5, Supabase JS v2 (auth), lucide-react icons, Vitest 2 (new, dev only).

**Spec:** `docs/superpowers/specs/2026-10-15-user-app-area-design.md`

## Global Constraints

- All commands run from `frontend/` unless stated otherwise.
- No router library; extend the existing path switch.
- `/faq` and `/reset-password` never redirect.
- Redirects use `window.location.replace`; Sign Out uses `window.location.assign('/')`.
- Reuse existing CSS classes (`header`, `nav`, `header__actions`, `menu-toggle`, `page-banner`, `section`, `btn btn--primary`); new classes are prefixed `app-` or `coming-soon`.
- Match surrounding code: no semicolons, single quotes, 2-space indent, short `//` comments only where the why isn't obvious.
- Vitest is a devDependency only; nothing new ships to the browser.

## Review Focus

1. **Sign Out races the signed-out redirect** — clicking Sign Out on an `/app` page must end on `/`, never `/signin`. Pinned by Task 4 manual check 8.
2. **Path prefix collisions** — `/application` or `/apple` must not count as app paths. Pinned by Task 1 tests.
3. **Deep or unknown app paths** — `/app/destinations/tozeur/extra`, `/app/faq`, `/app/signin` go to `/app`, never render a blank page. Pinned by Task 1 tests.
4. **Signed-out user on public pages** — `/`, `/destinations/<city>`, `/reset-password` must not redirect when signed out. Pinned by Task 1 tests.
5. **Phone width** — Sign Out and Profile must still be reachable when the header actions collapse below 992px. Pinned by Task 3 (mobile-only Sign Out in the menu, avatar stays visible) and Task 4 manual check 7.

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/src/redirects.js` (new) | `isAppPath`, `redirectFor`: pure, no `window` |
| `frontend/src/redirects.test.js` (new) | Vitest tests for the rules |
| `frontend/src/route.js` | adds `base` (`'/app'` or `''`) |
| `frontend/src/data.js` | adds `appNavLinks` |
| `frontend/src/sections/AppHeader.jsx` (new) | app top bar |
| `frontend/src/pages/AppHome.jsx`, `Planner.jsx`, `Profile.jsx` (new) | placeholder pages |
| `frontend/src/App.jsx` | app page table, header choice, session wait, redirects, sign out |
| `frontend/src/pages/Destinations.jsx`, `CityDetail.jsx` | `base`-prefixed links |
| `frontend/src/pages/Auth.jsx` | sign in / sign up land on `/app` |
| `frontend/src/styles.css` | user chip, mobile sign out, coming-soon |
| `frontend/package.json` | vitest + `test` script |

---

### Task 1: Redirect rules with Vitest

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/redirects.js`
- Test: `frontend/src/redirects.test.js`

**Interfaces:**
- Produces: `isAppPath(path: string): boolean`, `redirectFor(path: string, signedIn: boolean): string | null`. `path` is a pathname without trailing slash (`''` for the landing page).

- [ ] **Step 1: Install Vitest and add the script**

Run: `npm install --save-dev vitest@^2.1.9`

Then in `frontend/package.json` add to `"scripts"`:

```json
    "test": "vitest run"
```

(after `"preview"`, with a comma on the `preview` line).

- [ ] **Step 2: Write the failing tests**

Create `frontend/src/redirects.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { isAppPath, redirectFor } from './redirects.js'

describe('isAppPath', () => {
  it('matches /app and paths under it', () => {
    expect(isAppPath('/app')).toBe(true)
    expect(isAppPath('/app/festivals')).toBe(true)
  })

  it('does not match paths that only start with the letters "app"', () => {
    expect(isAppPath('/application')).toBe(false)
    expect(isAppPath('/apple')).toBe(false)
    expect(isAppPath('')).toBe(false)
  })
})

describe('redirectFor when signed out', () => {
  it.each(['/app', '/app/profile', '/app/destinations/tozeur', '/app/nope'])('sends %s to /signin', (path) => {
    expect(redirectFor(path, false)).toBe('/signin')
  })

  it.each(['', '/destinations', '/destinations/tozeur', '/festivals', '/community', '/contact', '/faq', '/signin', '/signup', '/reset-password', '/application'])('leaves %s alone', (path) => {
    expect(redirectFor(path, false)).toBe(null)
  })
})

describe('redirectFor when signed in', () => {
  it.each(['', '/signin', '/signup'])('sends %s to /app', (path) => {
    expect(redirectFor(path, true)).toBe('/app')
  })

  it.each([
    ['/destinations', '/app/destinations'],
    ['/destinations/tozeur', '/app/destinations/tozeur'],
    ['/festivals', '/app/festivals'],
    ['/community', '/app/community'],
    ['/contact', '/app/contact'],
  ])('sends %s to %s', (path, target) => {
    expect(redirectFor(path, true)).toBe(target)
  })

  it.each(['/app', '/app/destinations', '/app/destinations/tozeur', '/app/festivals', '/app/community', '/app/contact', '/app/planner', '/app/profile'])('stays on %s', (path) => {
    expect(redirectFor(path, true)).toBe(null)
  })

  it.each(['/app/nope', '/app/faq', '/app/signin', '/app/destinations/tozeur/extra'])('sends unknown app path %s to /app', (path) => {
    expect(redirectFor(path, true)).toBe('/app')
  })

  it.each(['/faq', '/reset-password', '/application', '/unknown'])('leaves %s alone', (path) => {
    expect(redirectFor(path, true)).toBe(null)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Failed to resolve import "./redirects.js"`.

- [ ] **Step 4: Implement the rules**

Create `frontend/src/redirects.js`:

```js
// Where to send someone based on the page they opened and whether they're signed in.
// Pure (no window) so it can be unit-tested; paths have no trailing slash, '' is the landing page.

// Pages that exist under /app, as the part after '/app'
const appPages = ['', '/destinations', '/festivals', '/community', '/contact', '/planner', '/profile']
// Public pages that have an /app twin
const mirrored = ['/destinations', '/festivals', '/community', '/contact']
const isCityPath = (path) => /^\/destinations\/[^/]+$/.test(path)

export const isAppPath = (path) => path === '/app' || path.startsWith('/app/')

export function redirectFor(path, signedIn) {
  if (!signedIn) return isAppPath(path) ? '/signin' : null

  if (isAppPath(path)) {
    const rest = path.slice('/app'.length)
    return appPages.includes(rest) || isCityPath(rest) ? null : '/app'
  }
  if (['', '/signin', '/signup'].includes(path)) return '/app'
  if (mirrored.includes(path) || isCityPath(path)) return `/app${path}`
  return null
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests in `src/redirects.test.js` green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/redirects.js src/redirects.test.js
git commit -m "Add redirect rules for the /app area, with Vitest"
```

---

### Task 2: Links that stay inside the app

**Files:**
- Modify: `frontend/src/route.js`
- Modify: `frontend/src/pages/Destinations.jsx:49`
- Modify: `frontend/src/pages/CityDetail.jsx:56,119`

**Interfaces:**
- Consumes: `isAppPath` from Task 1.
- Produces: `base: '/app' | ''` exported from `route.js`.

- [ ] **Step 1: Add `base` to `route.js`**

Replace the whole file `frontend/src/route.js` with:

```js
import { isAppPath } from './redirects.js'

// Current page path without a trailing slash ("" for the landing page).
export const currentPath = window.location.pathname.replace(/\/+$/, '')

// Prefix for links between shared pages, so they stay inside the signed-in area.
export const base = isAppPath(currentPath) ? '/app' : ''
```

- [ ] **Step 2: Use `base` in Destinations**

In `frontend/src/pages/Destinations.jsx`, add `import { base } from '../route.js'` next to the other imports, and change line 49:

```jsx
                <a key={city.id} href={`${base}/destinations/${city.id}`} className="guide-card">
```

- [ ] **Step 3: Use `base` in CityDetail**

In `frontend/src/pages/CityDetail.jsx`, add `import { base } from '../route.js'` next to the other imports, and change the two links:

Line 56:
```jsx
          <a href={`${base}/destinations`} className="btn btn--primary">Browse other cities</a>
```

Line 119:
```jsx
          <a href={`${base}/destinations`} className="city-hero__back"><ArrowLeft size={16} /> Back to destinations</a>
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; build prints `✓ built in`. (Public pages are unchanged: `base` is `''` outside `/app`.)

- [ ] **Step 5: Commit**

```bash
git add src/route.js src/pages/Destinations.jsx src/pages/CityDetail.jsx
git commit -m "Keep destination links inside /app when browsing there"
```

---

### Task 3: App navbar and placeholder pages

**Files:**
- Modify: `frontend/src/data.js:15-22`
- Create: `frontend/src/sections/AppHeader.jsx`
- Create: `frontend/src/pages/AppHome.jsx`, `frontend/src/pages/Planner.jsx`, `frontend/src/pages/Profile.jsx`
- Modify: `frontend/src/styles.css` (header block ~line 120, mobile block ~line 854)

**Interfaces:**
- Consumes: `currentPath` from `route.js`.
- Produces:
  - `appNavLinks: [label, href][]` in `data.js`
  - `<AppHeader user={User} onSignOut={() => void} />` (default export)
  - `<AppHome />`, `<Planner />`, `<Profile user={User} />` (default exports). `User` is the Supabase user object: `user.email`, `user.user_metadata.full_name`.

- [ ] **Step 1: Add `appNavLinks`**

In `frontend/src/data.js`, right after the `navLinks` array (after line 22), add:

```js

// Navbar of the signed-in area; Profile and Sign Out sit on the right of the header.
export const appNavLinks = [
  ['Home', '/app'],
  ['Destinations', '/app/destinations'],
  ['Festivals', '/app/festivals'],
  ['Community', '/app/community'],
  ['Contact', '/app/contact'],
  ['AI Planner', '/app/planner'],
]
```

- [ ] **Step 2: Create `AppHeader.jsx`**

Create `frontend/src/sections/AppHeader.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { LogOut, Menu, X, Compass } from 'lucide-react'
import { brand, appNavLinks } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'

// "Leila Ben Ali" -> "LB", "tom@x.com" -> "T"
const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

// Home is only active on /app itself; the other sections also cover their sub-pages.
const isActive = (href) => href === currentPath || (href !== '/app' && currentPath.startsWith(`${href}/`))

export default function AppHeader({ user, onSignOut }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const name = user.user_metadata?.full_name || user.email

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'header--fixed' : ''}`}>
      <div className="container header__inner">
        <a href="/app" className="logo">
          <Compass size={30} strokeWidth={2.2} />
          <span>{brand.name}</span>
        </a>

        <nav className={`nav nav--app ${open ? 'nav--open' : ''}`}>
          {appNavLinks.map(([label, href]) => (
            <a key={label} href={href} className={isActive(href) ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>
          ))}
          {/* The header's Sign Out button is hidden on phones, so the menu gets its own */}
          <button type="button" className="app-nav__signout" onClick={onSignOut}>Sign Out</button>
        </nav>

        <div className="header__actions">
          <a href="/app/profile" className={`app-user ${currentPath === '/app/profile' ? 'app-user--active' : ''}`} title="Profile">
            <span className="app-user__avatar" aria-hidden="true">{initials(name)}</span>
            <span className="app-user__name">{name}</span>
          </a>
          <button type="button" className="btn btn--primary header__cta" onClick={onSignOut}>
            Sign Out <LogOut size={16} />
          </button>
          <Switcher />
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create the placeholder pages**

Create `frontend/src/pages/AppHome.jsx`:

```jsx
import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

// Placeholder until posts live in Supabase (part 2: feed).
export default function AppHome() {
  useEffect(() => {
    document.title = 'Home - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Your feed</h1>
          <p>Posts from travellers across Tunisia will show up here.</p>
        </div>
      </section>
      <section className="section">
        <div className="container coming-soon">
          <p>The feed is coming soon. In the meantime, see what people are sharing in the community.</p>
          <a href="/app/community" className="btn btn--primary">Go to Community <ArrowRight size={16} /></a>
        </div>
      </section>
    </>
  )
}
```

Create `frontend/src/pages/Planner.jsx`:

```jsx
import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

// Placeholder until the AI planner exists (part 4).
export default function Planner() {
  useEffect(() => {
    document.title = 'AI Planner - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>AI Planner</h1>
          <p>Tell us where and how you like to travel, and get a day-by-day route.</p>
        </div>
      </section>
      <section className="section">
        <div className="container coming-soon">
          <p>The AI planner is coming soon. Until then, start from the city guides.</p>
          <a href="/app/destinations" className="btn btn--primary">Browse Destinations <ArrowRight size={16} /></a>
        </div>
      </section>
    </>
  )
}
```

Create `frontend/src/pages/Profile.jsx`:

```jsx
import { useEffect } from 'react'

// Read-only until profile editing lands (part 3).
export default function Profile({ user }) {
  useEffect(() => {
    document.title = 'Profile - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>{user.user_metadata?.full_name || 'Your profile'}</h1>
          <p>{user.email}</p>
        </div>
      </section>
      <section className="section">
        <div className="container coming-soon">
          <p>Editing your profile is coming soon.</p>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 4: Add the styles**

In `frontend/src/styles.css`, right after the `.header__user { ... }` line (~line 120), add:

```css
.nav--app { gap: 28px; }
.app-user { display: inline-flex; align-items: center; gap: 10px; color: var(--white); font-weight: 500; }
.app-user:hover .app-user__name, .app-user--active .app-user__name { color: var(--primary); }
.app-user__avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center; background: var(--primary); color: var(--white); font-size: 14px; font-weight: 700;
}
.app-user__name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-nav__signout { display: none; }
.coming-soon { max-width: 560px; text-align: center; }
.coming-soon p { margin-bottom: 24px; }
```

In the `@media (max-width: 991px)` block, after the `.nav a:last-child` line (~line 862), add:

```css
  .app-user__name { display: none; }
  .app-nav__signout {
    display: block; padding: 12px 0; background: none; border: 0; text-align: left; cursor: pointer;
    color: var(--white); font: inherit; font-size: 17px; font-weight: 500;
  }
  .app-nav__signout:hover { color: var(--primary); }
```

And add one more breakpoint so seven nav items fit on small laptops, after the `@media (max-width: 991px)` block closes:

```css
@media (min-width: 992px) and (max-width: 1199px) {
  .nav--app { gap: 18px; }
  .nav--app a { font-size: 16px; }
  .app-user__name { display: none; }
}
```

Note: `.coming-soon` sits on an element that also has `.container`, which already centres it with `margin: 0 auto`.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: `✓ built in`. (These files are not wired in yet; Task 4 does that.)

- [ ] **Step 6: Commit**

```bash
git add src/data.js src/sections/AppHeader.jsx src/pages/AppHome.jsx src/pages/Planner.jsx src/pages/Profile.jsx src/styles.css
git commit -m "Add app navbar and placeholder Feed, AI Planner and Profile pages"
```

---

### Task 4: Wire the app area into App.jsx

**Files:**
- Modify: `frontend/src/App.jsx` (whole file)
- Modify: `frontend/src/pages/Auth.jsx` (`signIn` and `signUp`)

**Interfaces:**
- Consumes: `isAppPath`, `redirectFor` (Task 1); `currentPath` (route.js); `AppHeader`, `AppHome`, `Planner`, `Profile` (Task 3); `supabase`, `useUser` (`supabase.js`: `useUser()` returns `undefined` while loading, then a user or `null`).

- [ ] **Step 1: Replace `App.jsx`**

Replace the whole file `frontend/src/App.jsx` with:

```jsx
import Header from './sections/Header.jsx'
import AppHeader from './sections/AppHeader.jsx'
import Hero from './sections/Hero.jsx'
import Tours from './sections/Tours.jsx'
import About from './sections/About.jsx'
import PopularDestinations from './sections/PopularDestinations.jsx'
import Features from './sections/Features.jsx'
import TravelStyles from './sections/TravelStyles.jsx'
import Testimonials from './sections/Testimonials.jsx'
import Cta from './sections/Cta.jsx'
import Blog from './sections/Blog.jsx'
import Footer from './sections/Footer.jsx'
import Faq from './pages/Faq.jsx'
import Contact from './pages/Contact.jsx'
import Destinations from './pages/Destinations.jsx'
import CityDetail from './pages/CityDetail.jsx'
import { SignIn, SignUp, ResetPassword } from './pages/Auth.jsx'
import Festivals from './pages/Festivals.jsx'
import Community from './pages/Community.jsx'
import AppHome from './pages/AppHome.jsx'
import Planner from './pages/Planner.jsx'
import Profile from './pages/Profile.jsx'
import { useEffect, useState } from 'react'
import { currentPath } from './route.js'
import { isAppPath, redirectFor } from './redirects.js'
import { supabase, useUser } from './supabase.js'

// Tiny path-based page switch; any other public path shows the landing page.
const pages = { '/faq': Faq, '/contact': Contact, '/destinations': Destinations, '/festivals': Festivals, '/community': Community, '/signin': SignIn, '/signup': SignUp, '/reset-password': ResetPassword }
// Signed-in area; keep in sync with appPages in redirects.js
const appPages = { '/app': AppHome, '/app/destinations': Destinations, '/app/festivals': Festivals, '/app/community': Community, '/app/contact': Contact, '/app/planner': Planner, '/app/profile': Profile }
const inApp = isAppPath(currentPath)
const cityId = currentPath.match(/^\/(?:app\/)?destinations\/([^/]+)$/)?.[1]
const Page = cityId ? () => <CityDetail id={cityId} /> : (inApp ? appPages : pages)[currentPath]

export default function App() {
  const user = useUser()
  const [signingOut, setSigningOut] = useState(false)
  // Wait for the saved session before deciding, so the wrong page never flashes
  const redirect = user === undefined || signingOut ? null : redirectFor(currentPath, user !== null)
  const ready = user !== undefined && !redirect && !(inApp && !user)

  useEffect(() => {
    if (redirect) window.location.replace(redirect)
  }, [redirect])

  // Coming from another page via a "/#section" link: scroll once the sections exist.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (ready && id) document.getElementById(id)?.scrollIntoView()
  }, [ready])

  // The flag stops the signed-out redirect to /signin from racing this navigation
  const signOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      window.location.assign('/')
    }
  }

  if (!ready) return null

  return (
    <>
      {inApp ? <AppHeader user={user} onSignOut={signOut} /> : <Header />}
      {Page ? <main><Page user={user} /></main> : <main>
        <Hero />
        <Tours />
        <About />
        <TravelStyles />
        <PopularDestinations />
        <Features />
        <Testimonials />
        <Cta />
        <Blog />
      </main>}
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Send sign in / sign up to `/app`**

In `frontend/src/pages/Auth.jsx`:

In `signIn`, change `window.location.assign('/')` to:
```js
    window.location.assign('/app')
```

In `signUp`, inside `if (data.session) { ... }`, change `window.location.assign('/')` to:
```js
      window.location.assign('/app')
```

Leave `savePassword`'s `window.location.assign('/')` as is (`/` redirects to `/app`).

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build`
Expected: tests PASS; `✓ built in`.

- [ ] **Step 4: Manual check in the browser**

Run: `npm run dev`, open `http://localhost:5500`.

1. Signed out, open `/app` → lands on `/signin`.
2. Sign in → lands on `/app` with the app navbar; Home highlighted.
3. Click each navbar link → right page opens and its link is highlighted; avatar chip opens `/app/profile` showing your name and email.
4. Destinations → click a city → URL is `/app/destinations/<city>`, Destinations stays highlighted; "Back to destinations" goes to `/app/destinations`.
5. While signed in, type `/`, `/destinations`, `/signin` in the address bar → each lands on its `/app` version; pressing Back does not bounce forward again.
6. `/faq` and `/reset-password` load with no redirect while signed in.
7. Narrow the window below 992px → name hides, avatar stays; menu toggle opens the links with a Sign Out item at the bottom.
8. Click Sign Out (header button, and on another run the menu item) → lands on `/` with the public header and Sign In button, never on `/signin`.

Expected: all 8 pass. Fix anything that doesn't before committing.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/pages/Auth.jsx
git commit -m "Route signed-in users into the /app area"
```
