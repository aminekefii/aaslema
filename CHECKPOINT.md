# Checkpoint

Last updated: 2026-10-15 (after commit `9bcccb0`)

## State

- Branch `main`, working tree clean.
- Frontend tests: 9 files, 159 tests, all passing (`npx vitest run` in `frontend/`).
- Supabase SQL lives in `backend/supabase/` (`001`–`006`). Each file is run
  by hand in the Supabase SQL editor; check that `004_city_likes_visits.sql`,
  `005_city_visit_counts.sql` and `006_reviews.sql` have been applied before
  testing likes, visits, the Most Visited section and Rate Your Trip reviews.

## Done

| Feature | Spec / plan | Commits |
|---|---|---|
| Public site (landing, destinations, city pages, festivals, community, FAQ, contact, sign in/up pages) | — | `4355355` – `89e1b58` (10-09) |
| Split into `frontend/` and `backend/` | — | `db4beea` |
| Supabase accounts: email sign up, sign in, password reset | — | `9375428` |
| User app area `/app` (navbar, redirects, placeholder Feed / AI Planner / Profile) | `2026-10-15-user-app-area` | `fbc311b` – `e87d4b7` |
| Admin part 1: `/admin` area, admin role, read-only Users page | `2026-10-15-admin-users` | `a21ad73` – `1fc43b6` |
| Admin part 2: Contact messages saved in Supabase, admin Messages page with new-message count | `2026-10-15-admin-messages` | `55fcb23` – `ba91b9e` |
| Destination likes (shared counts) and visits (personal), saved in Supabase | `2026-10-15-city-likes-visits` | `0eee8a3` – `8c3d7f5` |
| Landing page Most Visited: top 6 destinations by real visit counts (`city_visit_counts()`), same design, "N visits" on each card | — (designed in chat) | `4b0917a` |
| Rate Your Trip reviews: `/app/review` form, admin Reviews page (approve / unpublish / delete), approved reviews in the landing slider | `2026-10-15-trip-reviews` | `4b101f3` – `9bcccb0` |

Specs and plans are in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Next

From the specs' "Future work" sections:

1. **Admin part 3 / Feed:** Community posts in Supabase with moderation; real feed in `/app`.
2. **Admin part 4:** move destinations, festivals and FAQs into the database.
3. **Profile:** edit name and avatar, list own posts, "Places I've visited".
4. **AI Planner:** needs an AI provider and a backend endpoint; "Add to plan" moves to Supabase with it.
5. **Reviews follow-ups:** show the user's review on Profile; users delete their own review; per-destination reviews (Community Voice); the small fixes deferred in review (form after an admin delete, emoji initials, rename sends a review back to pending, stale success message).

6. Smaller items: user actions in admin (block, delete, promote), paging for users,
   message rate limiting / archive / email notification, React Router if the app keeps growing.

From `documentations/planning.txt` (not started): dark/light theme and language
switch, achievements, Cultural Pulse = events, AI chatbot for Nomad Intelligence,
per-place guide with posts and moments, highlights, Community Voice = place reviews,
logo, current events on the home page.
