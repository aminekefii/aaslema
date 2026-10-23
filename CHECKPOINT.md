# Checkpoint

Last updated: 2026-10-20 (Netlify config added)

## State

- Profile dashboard, author photos, the Rate your trip move, My moments, Visited destinations, My plan and the AI Planner
  move, the festivals sign-in note, festivals in the plan, community posts (publish, edit, delete, like on
  `/app/community`), My posts (`/app/profile/posts`), post reports (admin page `/admin/reports`, read only) and the
  Feed at `/app` (newest moments and posts, view only) are merged into `main` and pushed to `origin/main` (`bd2aae7`).
- Only other branch: `google-sign-in` (not merged, see below).
- Frontend tests: 16 files, 263 tests, all passing (`npx vitest run` in `frontend/`).
- Supabase SQL lives in `backend/supabase/` (`001`–`019`). Each file is run
  by hand in the Supabase SQL editor; check that `004_city_likes_visits.sql`,
  `005_city_visit_counts.sql`, `006_reviews.sql`, `007_moments.sql`,
  `008_moment_likes.sql`, `009_profiles.sql`, `010_author_photos.sql`, `011_my_moments.sql`, `012_city_plans.sql`, `013_festival_plans.sql`, `014_community_posts.sql`, `015_my_posts.sql`, `016_post_reports.sql`, `017_feed_moments.sql`, `018_public_community_feed.sql` and `019_post_comments.sql` have been
  applied before testing likes, visits, the Most Visited section, Rate Your Trip reviews, destination moments, moment
  likes, the profile page, author photos, My moments, My plan (destinations and festivals), community posts, My posts, post reports, the Feed, the public community page and post comments.

## Waiting on you

- In the Supabase SQL Editor run, in order: `006`–`008` if not done yet, then `009_profiles.sql`, then `010_author_photos.sql`, then `011_my_moments.sql`, then `012_city_plans.sql`, then `013_festival_plans.sql`, then `014_community_posts.sql`, then `015_my_posts.sql`, then `016_post_reports.sql`, then `017_feed_moments.sql`, then `018_public_community_feed.sql`, then `019_post_comments.sql`.
  If you ever re-run `006` or `008` later, run `010` again afterwards (they replace its review and moment lists).
- Supabase Auth → URL Configuration: add `<site>/app/profile/edit` (and the localhost one) to Redirect URLs, so email-change links come back to Edit profile (not needed if a `/**` wildcard covers it).
- Continue with Google (to do later). The code is ready on branch `google-sign-in` (`372cc21`, not merged; `main`
  still shows "Google sign-in isn't available yet"). Before merging:
  - Google Cloud Console: OAuth consent screen (External; scopes email, profile, openid; Publish app so everyone
    can sign in, not only test users), then Credentials → OAuth client ID → Web application with redirect URI
    `https://<project-ref>.supabase.co/auth/v1/callback`.
  - Supabase → Authentication → Sign In / Providers → Google: turn on, paste the Client ID and Client secret (the
    secret never goes in the frontend).
  - Supabase → URL Configuration → Redirect URLs: `http://localhost:5500/**` and every site address (e.g. Netlify).
  - Test at `/signin`: Google should bring you back to `/app` signed in, admins to `/admin`.
- Netlify: `netlify.toml` is in the repo (builds `frontend/`, publishes `dist`, sends every path to `index.html`).
  To deploy:
  - Netlify → Add new site → Import from Git → pick the repo; the build settings come from `netlify.toml`.
  - Site configuration → Environment variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
    (same values as `frontend/.env.local`) before the first deploy, or redeploy after; without them accounts are off.
  - Supabase → Authentication → URL Configuration: Site URL = the Netlify address, and add
    `https://<site>.netlify.app/**` to Redirect URLs (password reset and email change come back there).
  - Check on the live site: refreshing `/app`, `/signin`, `/admin` loads the page (not "Page not found"); sign in works.
- Browser checks nobody has done yet (no browser was available):
  - Reviews: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-15-trip-reviews-design.md`, plus the
    "Read more" popup with a long review.
  - Moments: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-15-city-moments-design.md`, including a
    large phone photo and an iPhone HEIC photo.
  - Profile: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-profile-dashboard-design.md`,
    plus: before `009` is run the page shows "Couldn't load your profile. Please refresh the page."; picking a PDF as
    photo shows "Couldn't read that photo." and keeps the old one; buttons are disabled while saving.
  - Author photos: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-author-photos-design.md`
    (the small photo on moment cards must be a 28px circle, not a big 4:3 picture).
  - My moments: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-my-moments-design.md`;
    before `011` is run the page shows "Couldn't load your moments." with Try again.
  - My plan: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-my-plan-design.md`.
  - Festivals in the plan: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-festival-plans-design.md`.
  - Community posts: the "Manual (owner)" list in `docs/superpowers/specs/2026-10-19-community-posts-design.md`;
    before `014` is run `/app/community` shows "Couldn't load posts." with Try again.
  - My posts (`/app/profile/posts`): your posts show newest first with like counts; Edit saves and the card
    updates; Delete asks first and removes the card (also gone from `/app/community`); with no posts the page says
    "You haven't published any posts yet."; before `015` is run it shows "Couldn't load your posts." with Try again.
  - Post reports: as user B, ⋯ on A's post → Report post; under 10 characters shows "Please tell us a little more (at least
    10 characters)."; a real reason shows "Report received…"; reporting the same post again says "You already reported this
    post."; there's no ⋯ on your own posts. As an admin, `/admin/reports` shows B's name, the date, the post title and
    the reason; See post shows "Coming soon". Deleting the post removes its reports.
  - Feed (`/app`): Moments shows the newest 12 approved moments from all destinations (photo, author, destination,
    caption, time; a card opens its destination), Posts the newest 10 posts; no buttons on either. Before `017` is run
    Moments shows "Couldn't load moments." with Try again while Posts still loads.

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
| App navbar shows only the profile circle | — | `260646c` |
| Landing reviews: long reviews cut at 5 lines with a "Read more" popup | — | `64bc6c2` |
| City page: visitors must sign in to add to plan | — | `d874d04` |
| City page: Share popup shows "Coming soon" | — | `fd3ac5e` |
| Landing "Open the trip planner" → sign in | — | `8b1744b` |
| Highlight cards: camera button removed | — | `6be105b` |
| Moments tab: visitors get a sign-in link instead of "Add moment" | — | `695d85b` |
| Destination moments: photo upload to a private Supabase bucket, admin Moments page (approve / delete), approved moments in a carousel on each destination | `2026-10-15-city-moments` | `5c83124` – `266efbc` |
| Moments: iPhone HEIC photos converted (also when named .JPG) | — | `8f9ac1a`, `4cb490c` |
| Moment likes (`008_moment_likes.sql`); users can't like their own moment | — | `05a45ca`, `2d2f2e4` |
| City page: "Add to plan" showed a Coming soon popup (replaced by My plan) | — | `f971492` |
| Profile dashboard: sidebar layout, Edit profile with name, phone, city, country, photo, email, password; photo in the navbar (`009_profiles.sql`) | `2026-10-16-profile-dashboard` | `95ca377` – `6983d31` |
| Author photos and live names on landing page reviews and destination moments (`010_author_photos.sql`) | `2026-10-16-author-photos` | `3c64d97` – `85ccc51` |
| Rate your trip moved from the app navbar into the profile dashboard (`/app/profile/review`; `/app/review` redirects there) | — | `01fb4a2` |
| My moments in the profile dashboard (`011_my_moments.sql`); Edit profile moved to `/app/profile/edit` | `2026-10-16-my-moments` | `571a705` – `6910603` + review fix |
| Visited destinations in the profile dashboard (`/app/profile/visited`; no SQL) | — | `96b3e8a` |
| My plan: Add to plan saves to Supabase; My plan section in the profile dashboard (`012_city_plans.sql`) | `2026-10-16-my-plan` | `0f4c737` – `f3c2a3f` |
| AI Planner moved from the app navbar into the profile dashboard (`/app/profile/planner`; `/app/planner` redirects there) | — | `de08e96` |
| Festivals page: visitors see "Sign in to add festivals to your plan" | — | `0f8f0f4` |
| Festivals in the plan: Add to plan on `/app/festivals`; My plan split into Destinations and Festivals (`013_festival_plans.sql`) | `2026-10-16-festival-plans` | `e11baa7` – `67bf3ac` |
| Community page: photos and tags removed; cards show photo, name, date, title, post; Share shows "Coming soon" | — | `1fc7a99`, `d00efe6` |
| Community posts on `/app/community`: publish, edit, delete own, like any post (`014_community_posts.sql`); `/community` unchanged | `2026-10-19-community-posts` | `fdebbd4` – `e81f478` |
| My posts in the profile dashboard: your posts with likes, edit and delete (`015_my_posts.sql`) | — (designed in chat) | `9c2d59d` |
| Post reports: users report other people's posts; admin Post reports page, read only, See post "Coming soon" (`016_post_reports.sql`) | — (designed in chat) | `c85a1d7` |
| Feed at `/app`: newest moments and posts, view only (`017_feed_moments.sql`) | — (designed in chat) | `bd2aae7` |
| Landing page FAQ at `/#faq` (FAQ page and nav link removed, `b2c444d`); `/community` shows the real posts to visitors, who are sent to sign in to post, like or report (`018_public_community_feed.sql`) | — (designed in chat) | `6703abe` |
| Community filters sidebar: Location dropdown, Sort by Latest / Oldest / Most liked (`sortPosts`), replaces the city buttons; shown above the posts on tablets and phones | — (designed in chat) | next commit |

Specs and plans are in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Next

From the specs' "Future work" sections:

1. **Community follow-ups:** admin See post / deleting comments / handling reports / deleting posts, moderation (admins can't delete posts yet: only by hand in Supabase), sharing; Feed design.
2. **Admin part 4:** move destinations, festivals and FAQs into the database.
3. **Profile:** more sidebar sections (My reviews); delete/edit own moments; name + photo on Feed posts once they're in Supabase; photos on admin pages.
4. **AI Planner:** needs an AI provider and a backend endpoint; it can start from the user's plan (`city_plans`).
5. **Moments: iPhone photos upload partly green: cause found, uploads now refused (not committed yet).**
   The photos are incomplete files: in `C:\Users\amine\Pictures\14` 226 of the 607 HEIC files end before the
   image data their own box/iloc tables point to (e.g. `IMG_E8790.HEIC` is 571,529 bytes but needs 3,045,564); the
   missing tiles decode as green and no decoder can bring them back. `heifIsIncomplete` (`frontend/src/moments.js`)
   now spots them before decoding and the upload shows "This photo file is incomplete…" (moments and profile photo).
   Moments already uploaded from such files stay broken: delete them in Supabase (or once users can delete their
   own moments) and re-upload from a complete copy (straight from the iPhone, or with Settings → Photos →
   Transfer to Mac or PC → Keep Originals).
6. **Moments follow-ups:** users delete their own moments; unpublish; comments; the small fixes deferred in review (frozen upload on plain-http LAN testing, padded captions, links expiring after an hour, files left when a user is deleted).
7. **Reviews follow-ups:** show the user's review on Profile; users delete their own review; per-destination reviews (Community Voice); the small fixes deferred in review (form after an admin delete, emoji initials, rename sends a review back to pending, stale success message).

8. Smaller items:
 user actions in admin (block, delete, promote), paging for users,
   message rate limiting / archive / email notification, React Router if the app keeps growing.

From `documentations/planning.txt` (not started): dark/light theme and language
switch, achievements, Cultural Pulse = events, AI chatbot for Nomad Intelligence,
per-place guide with posts and moments, highlights, Community Voice = place reviews,
logo, current events on the home page.
