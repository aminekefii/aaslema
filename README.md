# Aaslema

A travel guide to Tunisia for backpackers and bikepackers: city guides for all 24 governorates,
festivals, a trip planner and a community where travellers share posts, photos and moments.
"Aaslema" is hello in Tunisian.

- **Live site:** deployed on Netlify from `main` (see [Deploying](#deploying)).
- **Progress and to-do list:** [`CHECKPOINT.md`](CHECKPOINT.md).

## What's in it

**For everyone**
- Landing page: destinations to start with, most visited places, festivals, traveller reviews,
  the 3 most liked community posts and an FAQ.
- Destinations: all 24 governorates with search; each has a full-photo header, overview, highlights,
  photo moments, and previous / next arrows to the neighbouring destinations.
- Festivals by region, and a contact form.
- Community: read every post, with search, location and hashtag filters, and sorting by latest,
  oldest or most liked.

**Signed in**
- Feed: the newest moments and posts; like them and comment on posts.
- Community: publish posts with up to 3 photos and 5 hashtags, like, comment, report.
- Destinations: like, add to your plan, mark as visited, share photo moments.
- Click any author's photo or name to see their public profile card.
- Profile: My moments, My posts, My plan, Visited destinations, Rate your trip, Trip planner,
  and Edit profile (photo, details, bio, travel style, email, password) with a live preview of
  your public card.

**Admins** (`/admin`)
- Users, contact messages, review and moment approval, post reports.

## Tech

- **Frontend:** React 18 + Vite 5, plain CSS (`frontend/src/styles.css`), `lucide-react` icons,
  Vitest for tests. iPhone HEIC photos are converted in the browser with `heic-to`.
- **Backend:** [Supabase](https://supabase.com): Auth, Postgres with row level security,
  and Storage for photos. There is no separate server; all rules live in the SQL files.
- **Hosting:** Netlify (or Docker + nginx).

## Project layout

```
frontend/              React site
  src/pages/           one file per page (admin pages in pages/admin/)
  src/sections/        landing page sections, header, footer, layouts
  src/components/      shared pieces (logo, dialogs, profile card, post photos…)
  src/*Api.js          Supabase calls (never throw; pages get plain values back)
  src/*.js             rules and helpers, each with a *.test.js next to it
  public/images/       photos, logo, header backgrounds
  CREDITS.md           photo credits and licences
backend/
  supabase/            numbered SQL files (001–023), run in order
  README.md            what each SQL file does
docs/superpowers/      design specs and implementation plans
netlify.toml           Netlify build and routing
docker-compose.yml     local run with Docker
```

## Running locally

1. **Supabase keys.** Copy `frontend/.env.example` to `frontend/.env.local` and fill in your
   project URL and **publishable** key (Supabase → Project Settings → API Keys). Never put the
   secret key in the frontend.
2. **Database.** In the Supabase SQL Editor, run every file in `backend/supabase/` once, in
   number order (they are safe to re-run). See [`backend/README.md`](backend/README.md).
3. **Start the site:**

   ```bash
   cd frontend
   npm install
   npm run dev        # http://localhost:5500
   ```

Other commands, from `frontend/`:

| Command | What it does |
|---|---|
| `npm test` | runs all tests (Vitest) |
| `npm run build` | production build into `frontend/dist` |
| `npm run preview` | serves the production build on http://localhost:5500 |

**With Docker:** `docker compose up --build`, then open http://localhost:5500.

## Deploying

Netlify builds from `frontend/` (settings in `netlify.toml`) and redeploys on every push to `main`.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Site configuration →
Environment variables. New SQL files must be run in Supabase **before** pushing code that uses them.

## Design

The look is called **Medina**, after Tunisia's limewashed walls, Sidi Bou Said doors and the
red of the logo. Colours and fonts are tokens at the top of `frontend/src/styles.css`.

| Token | Colour | Used for |
|---|---|---|
| Limewash | `#F6F5F2` | page background |
| Ink blue | `#0F2A47` | headings, header, footer, dark areas |
| Sidi Bou Said blue | `#1F5FA8` | links, icons, hashtags, avatars, focus rings |
| Saffron | `#F2B544` | buttons (with ink-blue text) |
| Sand | `#F1E7D4` | fact chips (vibe, population, city) |
| Logo red | `#E30618` | the logo, likes and the current-page marker only |
| Olive | `#5E7D3A` | success messages |

- **Fonts:** Bricolage Grotesque for headings, Figtree for text (Google Fonts).
- **Signature shape:** the doorway arch framing the landing page photo.
- **Rules:** sentence case everywhere; every colour pair meets WCAG AA contrast; light and dark themes.

## Credits

Photo credits and licences are in [`frontend/CREDITS.md`](frontend/CREDITS.md). The header
photos of Nabeul, Sfax and Sidi Bouzid also show their photographer and licence on the page.
