# Backend

Accounts use Supabase Auth, and admin features use SQL functions in Supabase (see below). The rest of the dynamic data still lives in the browser (`localStorage`); these are the next candidates for a real backend:

- Sign in / sign up (`frontend/src/pages/Auth.jsx`) — Supabase Auth
- Community posts (`frontend/src/pages/Community.jsx`)
- City likes / saved items (`frontend/src/pages/CityDetail.jsx`)
- Contact form submissions (`frontend/src/pages/Contact.jsx`)

## Supabase SQL

`supabase/` holds numbered SQL files. Run each once, in order, in the
Supabase dashboard's SQL Editor (they are safe to re-run):

1. `001_admin_users.sql` — admin check and the admin Users list
2. `002_make_admin.sql` — marks the site owner's account as admin; the result must show one row. Sign out and back in afterwards
3. `003_contact_messages.sql` — stores Contact form messages; only admins can read them
4. `004_city_likes_visits.sql` — destination likes (shared counts) and visits (personal)
5. `005_city_visit_counts.sql` — visit counts per destination for the landing page's Most Visited section
6. `006_reviews.sql` — Rate Your Trip reviews; admins approve them before they show on the landing page
