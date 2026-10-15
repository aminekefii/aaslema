# Backend

Not started yet. The frontend currently keeps all dynamic data in the browser
(`localStorage`), so these are the first candidates for a real API:

- Sign in / sign up (`frontend/src/pages/Auth.jsx`) — Supabase Auth
- Community posts (`frontend/src/pages/Community.jsx`)
- City likes / saved items (`frontend/src/pages/CityDetail.jsx`)
- Contact form submissions (`frontend/src/pages/Contact.jsx`)

## Supabase SQL

`supabase/` holds numbered SQL files. Run each once, in order, in the
Supabase dashboard's SQL Editor (they are safe to re-run):

1. `001_admin_users.sql` — admin check and the admin Users list
2. `002_make_admin.sql` — marks the site owner's account as admin (sign out
   and back in afterwards)
