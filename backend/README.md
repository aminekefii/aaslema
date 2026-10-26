# Backend

Aaslema has no server of its own: everything dynamic lives in [Supabase](https://supabase.com).

- **Auth:** sign up, sign in, password reset, email change.
- **Postgres:** every table has row level security, so people only change their own rows. Lists
  that mix everyone's data (feeds, comments, profile cards) are read through `security definer`
  functions that return only public fields: never a phone number, an email or a user id.
- **Storage:** three photo buckets.
  - `avatars`: profile photos, public.
  - `moments`: destination photos, private, shown only once an admin approves them.
  - `post-photos`: community post photos, public.

The frontend talks to Supabase directly with the publishable key (see `frontend/.env.example`).

## Supabase SQL

`supabase/` holds numbered SQL files. Run each once, **in order**, in the Supabase dashboard's
SQL Editor. They are safe to re-run. If you re-run `006` or `008` later, run `010` again
afterwards (they replace its review and moment lists).

| # | File | What it adds |
|---|---|---|
| 1 | `001_admin_users.sql` | the admin check and the admin Users list |
| 2 | `002_make_admin.sql` | marks the site owner's account as admin (must show one row; sign out and back in after) |
| 3 | `003_contact_messages.sql` | stores Contact form messages; only admins read them |
| 4 | `004_city_likes_visits.sql` | destination likes (shared counts) and visits (personal) |
| 5 | `005_city_visit_counts.sql` | visit counts for the landing page's Most visited section |
| 6 | `006_reviews.sql` | Rate your trip reviews; admins approve them before they show |
| 7 | `007_moments.sql` | destination moments and the private `moments` bucket; admins approve them |
| 8 | `008_moment_likes.sql` | moment likes; nobody can like their own |
| 9 | `009_profiles.sql` | profiles (name, phone, city, country, photo) and the `avatars` bucket |
| 10 | `010_author_photos.sql` | live author names and photos on reviews and moments |
| 11 | `011_my_moments.sql` | My moments in the profile, pending ones included |
| 12 | `012_city_plans.sql` | destinations in each user's plan |
| 13 | `013_festival_plans.sql` | festivals in each user's plan |
| 14 | `014_community_posts.sql` | community posts and post likes |
| 15 | `015_my_posts.sql` | My posts in the profile |
| 16 | `016_post_reports.sql` | reporting posts; the admin Post reports page |
| 17 | `017_feed_moments.sql` | newest approved moments for the Feed |
| 18 | `018_public_community_feed.sql` | visitors can read the community feed |
| 19 | `019_post_comments.sql` | comments on posts and comment counts |
| 20 | `020_feed_moment_likes.sql` | liking moments on the Feed |
| 21 | `021_profile_card.sql` | bio, travel style and counts for the public profile card |
| 22 | `022_public_card.sql` | signed-in users see other people's cards (from a post, moment or comment) |
| 23 | `023_post_photos_tags.sql` | up to 3 photos and 5 hashtags per post; the `post-photos` bucket |
| 24 | `024_admin_reported_posts.sql` | admins open and delete reported posts from Post reports |
| 25 | `025_delete_my_moments.sql` | users delete their own moments from My moments |

Each file starts with a comment saying what it does and which files must run before it.
`frontend/src/communitySql.test.js` checks the key permissions in these files (who can read and
write what), so a change that opens data up by mistake fails the tests.

## Auth settings

In Supabase → Authentication → URL Configuration, add the site's URLs (and `http://localhost:5500`)
to the Redirect URLs, including `/app/profile/edit` so email-change links come back to Edit profile.

## Setup on a new Supabase project

The SQL files hold the whole structure (tables, permissions, functions, buckets), so a new,
empty Supabase project is all you need. The project starts with no data: no users, posts,
moments, reviews or photos.

1. **Create the project.** On [supabase.com](https://supabase.com), create a new project and
   wait until it is ready.
2. **Run the SQL.** Open SQL Editor → New query. Paste each file from `supabase/`, from
   `001_admin_users.sql` to the last one, and run it, **in number order**, one at a time.
   Skip `002_make_admin.sql` for now (step 6). Each run should end with "Success".
3. **Check the buckets.** Storage should now show `avatars`, `moments` and `post-photos`.
4. **Auth URLs.** Authentication → URL Configuration:
   - Site URL: the live site's address (e.g. `https://<site>.netlify.app`).
   - Redirect URLs: add `http://localhost:5500/**` and `https://<site>/**` (every address the
     site runs on). Password reset and email-change links only come back to these.
   - Authentication → Sign In / Providers → Email: set Minimum password length to `8` and
     Password requirements to "Letters and digits". The site checks the same rule, but only
     this setting stops someone going around the site.
5. **Connect the site.** Project Settings → API Keys: copy the project URL and the
   **publishable** key (never the secret key).
   - Locally: copy `frontend/.env.example` to `frontend/.env.local` and paste them in.
   - On Netlify: Site configuration → Environment variables → `VITE_SUPABASE_URL` and
     `VITE_SUPABASE_PUBLISHABLE_KEY`, then redeploy.
6. **Make the admin.** Sign up on the site with the owner's email and confirm it. In
   `002_make_admin.sql`, replace `owner@example.com` (in the `update` and in the commented
   removal lines) with the owner's email, then run it. It must return exactly one row. Sign out and sign in again: the account now opens `/admin`.
7. **Try it.** Sign up as a normal user and post something, upload a moment, report a post from
   another account, then approve and delete things from the admin pages.

Optional, only if needed:

- **Emails.** Supabase's built-in email sender allows only a few emails per hour. For real
  users, set your own SMTP server under Authentication → Emails → SMTP Settings, and edit the
  email templates there if you want them branded.
- **Google sign-in.** Not on `main` yet (branch `google-sign-in`); the Google Cloud and Supabase
  steps are under "Continue with Google" in `CHECKPOINT.md`.

When a new SQL file is added later, run only that file, before deploying the code that uses it.
