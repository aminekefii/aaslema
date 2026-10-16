# Profile dashboard with Edit profile — design

Date: 2026-10-16
Status: approved in brainstorming, awaiting spec review

## Goal

`/app/profile` becomes a small dashboard for signed-in users: the app navbar on
top, a left sidebar (styled like the admin one) and a content area. The sidebar
starts with one section, **Edit profile**, where users change their name,
phone, city, country, profile photo, email and password.

Replaces the placeholder `src/pages/Profile.jsx`. Builds on `useUser()`,
`names.js`, `imageResize.js` (HEIC conversion), the admin sidebar styles and
`public.is_admin()`.

## Decisions

| Question | Decision |
|---|---|
| Fields | Full name, phone, city, country, profile photo, email, password |
| Where data lives | New `public.profiles` table (one row per user); email and password stay in Supabase Auth |
| Name and photo elsewhere | A database trigger copies `full_name` and `avatar_path` into the account's `user_metadata`, so the navbar, admin Users page, reviews and moments keep reading `user_metadata.full_name` unchanged |
| Who reads a profile row | The user, and admins. Phone, city and country are private |
| Photo storage | Public bucket `avatars`, JPEG only, ≤ 1 MB, `<user id>/<random uuid>.jpg`; anyone with the link can view (photos will show next to posts later) |
| Photo processing | Centre-cropped square, 400×400 JPEG in the browser; HEIC converted like moments |
| Phone | Info only, no SMS check; 6–20 characters of digits, spaces, `+ ( ) -`, at least 6 digits |
| City / country | Optional, ≤ 60 characters; country is free text with suggestions (Tunisia first) |
| Email change | Supabase `updateUser({ email })`; with "Secure email change" (default) both old and new address get a link; the email changes once confirmed |
| Password change | New + confirm, ≥ 8 characters, must match; `updateUser({ password })` |
| Layout | Under the app navbar; sidebar 220px; on phones a menu button above the content (like admin) |
| Sidebar items | Only "Edit profile" now (`/app/profile`); later sections get `/app/profile/...` paths |
| Navbar circle | Shows the photo when there is one, otherwise initials |

## Database and storage

New file `backend/supabase/009_profiles.sql`, run once in the Supabase SQL
Editor after 001 (and after 008_moment_likes.sql, so the numbers stay in order); safe to re-run.

```sql
-- User profiles: name, phone, city, country, photo. Email and password stay in Supabase Auth.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run, but re-running
-- does not change an existing table: alter its constraints by hand if they change later.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) <= 80 and btrim(full_name, E' \t\r\n') <> ''),
  phone text check (phone is null or (phone ~ '^\+?[0-9 ()-]{6,20}$' and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 6)),
  city text check (city is null or (char_length(city) <= 60 and btrim(city, E' \t\r\n') <> '')),
  country text check (country is null or (char_length(country) <= 60 and btrim(country, E' \t\r\n') <> '')),
  avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  updated_at timestamptz not null default now(),
  -- A user's photo must be in their own folder
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text)
);

alter table public.profiles enable row level security;

-- Rows are created by the trigger below; users only edit their own fields.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, city, country, avatar_path) on public.profiles to authenticated;

drop policy if exists "Users read their own profile, admins all" on public.profiles;
create policy "Users read their own profile, admins all" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Name for a new row: the sign-up name, else the part of the email before the @
create or replace function public.profile_name(meta jsonb, email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(coalesce(nullif(btrim(meta->>'full_name', E' \t\r\n'), ''), nullif(split_part(email, '@', 1), ''), 'Traveller'), 80)
$$;

-- New account → new profile row
create or replace function public.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, public.profile_name(new.raw_user_meta_data, new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile();

-- Existing accounts get a row once
insert into public.profiles (id, full_name)
select u.id, public.profile_name(u.raw_user_meta_data, u.email)
from auth.users u
on conflict (id) do nothing;

-- Keep updated_at fresh, and copy name and photo into the account's user_metadata
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

create or replace function public.profiles_sync_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('full_name', new.full_name, 'avatar_path', new.avatar_path)
  where id = new.id;
  return null;
end;
$$;

drop trigger if exists profiles_sync_metadata on public.profiles;
create trigger profiles_sync_metadata
  after update of full_name, avatar_path on public.profiles
  for each row execute function public.profiles_sync_metadata();

-- Public bucket: JPEG only, 1 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload avatars to their folder" on storage.objects;
create policy "Users upload avatars to their folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );

-- Deleting needs select too; files in a public bucket are readable by link anyway
drop policy if exists "Users see their own avatar files" on storage.objects;
create policy "Users see their own avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own avatars" on storage.objects;
create policy "Users delete their own avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

Notes:

- `user_metadata` is still editable by the user through `updateUser`, as
  today; nothing security-related reads it.
- The copied `avatar_path` reaches the browser only after the session is
  refreshed, so the page calls `supabase.auth.refreshSession()` after saving
  a name or photo; `useUser()` then gets the new user and the navbar updates.
- Photo files are public by link (random names); a user's list of files is not.

## Shared code

### `src/profile.js` (pure, tested)

- `PROFILE_LIMITS`: `{ name: 80, place: 60, phoneMin: 6, phoneMax: 20, passwordMin: 8 }`.
- `COUNTRIES`: suggestion list, Tunisia first (Tunisia, Algeria, Libya,
  Morocco, Egypt, France, Italy, Germany, Spain, United Kingdom, United
  States, Canada, Belgium, Switzerland, Netherlands).
- `profileForm(row)`: database row → form values (`null` → `''`).
- `cleanProfile(form)`: trims everything and collapses spaces inside the
  phone; returns `{ values }` (empty optional fields become `null`) or
  `{ error }` with one of: "Please enter your name.", "Name is too long
  (80 characters max).", "Please enter a valid phone number.", "City is
  too long (60 characters max).", "Country is too long (60 characters max).".
- `profileChanged(row, form)`: whether the cleaned form differs from the
  saved row (drives the Save button).
- `emailError(current, next)`: "Please enter an email address.", "Please
  enter a valid email address." (`x@y.z` shape), "That's already your
  email." (case-insensitive), or `null`.
- `passwordError(password, confirm)`: "Password must be at least 8
  characters.", "Passwords don't match.", or `null`.
- `avatarPath(userId, id)`: `` `${userId}/${id}.jpg` ``.

### `src/imageResize.js`

Adds `resizeToSquareJpeg(file, size = 400, quality = 0.85)`: opens the photo
with the existing `openPhoto` (HEIC included), crops the centred square of
the shorter side, draws it at `size`×`size` on white, returns a JPEG `Blob`.

### `src/profileApi.js` (never throws)

Same style as `momentsApi.js`: each function returns `{ error }` on failure
and catches its own exceptions; `supabase` may be `null`.

- `avatarUrl(path)`: public URL from `storage.from('avatars').getPublicUrl`,
  or `null` for no path.
- `fetchProfile(userId)` → `{ profile }` or `{ error }`.
- `saveProfile(userId, values)` → `{ profile }` or `{ error }`; updates the
  row, then `refreshSession()`.
- `uploadAvatar(userId, file, oldPath)`: `resizeToSquareJpeg`; upload to
  `avatarPath(userId, crypto.randomUUID())` (`upsert: false`, content type
  `image/jpeg`); set `avatar_path`; if that fails, delete the new file;
  on success delete `oldPath` (ignore errors) and `refreshSession()`.
  Returns `{ profile }` or `{ error }` ("Couldn't read that photo." when
  the image can't be opened).
- `removeAvatar(userId, oldPath)`: set `avatar_path` to `null`, delete the
  file, `refreshSession()`.
- `changeEmail(email)`: `updateUser({ email }, { emailRedirectTo: origin + '/app/profile' })`.
- `changePassword(password)`: `updateUser({ password })`.

Supabase error messages are passed through for email and password (they
explain rate limits and "same password"); other failures show a generic
message.

## Screens

### Routing and layout

- `App.jsx`: `/app/profile` renders `EditProfile` inside `ProfileLayout`
  (under the existing app navbar). `appPagePaths` already includes
  `/app/profile`, so redirects don't change.
- `data.js`: `profileNavLinks = [['Edit profile', '/app/profile']]`.
- `src/sections/ProfileLayout.jsx`: grid of sidebar (220px) and content;
  sidebar lists `profileNavLinks` with icons (`UserPen` for Edit profile),
  active link marked like admin (`aria-current="page"`). Below 992px the
  links collapse behind a "Profile menu" button above the content.
- CSS in `styles.css`: `.profile-dash`, `.profile-side`, `.profile-nav`,
  `.profile-nav--open`, `.profile-menu-toggle`, `.profile-main`, reusing the
  admin sidebar colours and spacing.
- `src/pages/Profile.jsx` is deleted.

### `src/pages/EditProfile.jsx`

Loads the profile row on mount (loading state "Loading your profile…";
on failure "Couldn't load your profile. Please refresh the page." and no
forms). Four cards (`.profile-card`), each saving on its own with its own
message line:

1. **Profile photo**: a 96px circle with the photo (`avatarUrl`) or the
   initials; "Change photo" (hidden file input, `accept="image/*,.heic,.heif"`)
   uploads right away with "Uploading…" on the button; "Remove photo"
   (only when there is one). Errors: "Couldn't read that photo.",
   "Couldn't save your photo. Please try again."
2. **Personal details**: Full name, Phone (`type="tel"`), City, Country
   (`list` → `<datalist>` of `COUNTRIES`). "Save changes" disabled until
   `profileChanged`; validation errors from `cleanProfile`; success "Saved."
3. **Email**: shows the current email; if `user.new_email` is set, "Waiting
   for you to confirm <new email>." Field "New email" + "Change email".
   Success: "We sent a confirmation link to both your old and new email.
   Your email changes once you open it." When the page opens from an email
   link, the `message` or `error_description` in the URL hash is shown in
   this card, then the hash is cleared.
4. **Password**: "New password", "Confirm password", "Update password";
   success "Password updated." and the fields clear.

### `src/sections/AppHeader.jsx`

The profile circle shows `<img>` of `avatarUrl(user.user_metadata.avatar_path)`
when set (empty alt text: the link's `aria-label` already names the user),
otherwise the initials as now. The profile pages start with a short page
banner showing the user's name and email, above the sidebar and content.

## Files

| File | Change |
|---|---|
| `backend/supabase/009_profiles.sql` | New |
| `frontend/src/profile.js`, `profile.test.js` | New |
| `frontend/src/profileApi.js` | New |
| `frontend/src/imageResize.js` | Add `resizeToSquareJpeg` |
| `frontend/src/sections/ProfileLayout.jsx` | New |
| `frontend/src/pages/EditProfile.jsx` | New |
| `frontend/src/pages/Profile.jsx` | Deleted |
| `frontend/src/App.jsx` | `/app/profile` → `ProfileLayout` + `EditProfile` |
| `frontend/src/data.js` | `profileNavLinks` |
| `frontend/src/sections/AppHeader.jsx` | Photo in the circle |
| `frontend/src/styles.css` | Dashboard, cards, avatar styles |

## Testing

- **Automated (Vitest):** `profile.test.js` covers `cleanProfile` (trim,
  empty name, long name, phone valid/invalid incl. too few digits, empty
  optional fields → `null`, long city/country), `profileChanged`,
  `emailError`, `passwordError`, `avatarPath`, `profileForm`. No redirect
  changes: a signed-in user opening `/app/profile` isn't redirected, so the
  email link's hash reaches the page.
- **Manual (owner):**
  1. Run `009_profiles.sql`; Table Editor shows a `profiles` row for every
     existing user; Storage shows a public `avatars` bucket. In Supabase
     Auth → URL Configuration, the site's `/app/profile` URL is an allowed
     redirect.
  2. Sign up a new user → a `profiles` row with their name appears.
  3. `/app/profile`: navbar on top, sidebar with "Edit profile" (active),
     four cards. At phone width the sidebar becomes a menu button.
  4. Personal details: clear the name → "Please enter your name."; phone
     `12` → "Please enter a valid phone number."; valid values → "Saved.";
     the navbar initials follow a new name; refresh keeps the values.
  5. Photo: upload a large phone photo, then an iPhone HEIC → square photo
     in the card and the navbar; Storage keeps only the newest file. Remove
     photo → initials again, file gone.
  6. Email: change to a new address → message; both inboxes get a link;
     after both are opened the card shows the new email.
  7. Password: mismatch → error; valid → "Password updated."; sign out and
     in with the new password.
  8. Security: as a normal user in the SQL Editor
     (`set role authenticated; set request.jwt.claims = '{"sub": "<user id>", "role": "authenticated"}';`)
     `select * from public.profiles` returns only that row, and
     `update public.profiles set full_name = 'x' where id <> '<user id>'`
     changes 0 rows.

## Future work

- More sidebar sections: Places I've visited, My moments, My reviews, My posts.
- Public view of name + photo for Feed, reviews and moments (and copying
  `avatar_path` onto them).
- Delete account; SMS-verified phone; admin view of profile details.
