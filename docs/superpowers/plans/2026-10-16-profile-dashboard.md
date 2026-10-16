# Profile Dashboard (Edit profile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/app/profile` into a dashboard (app navbar on top, left sidebar, content) whose first section, Edit profile, lets users change name, phone, city, country, photo, email and password.

**Architecture:** A new `public.profiles` table (one row per user, created by a trigger) holds name, phone, city, country and photo path; a trigger copies name and photo path into the account's `user_metadata`, so existing code keeps reading `user_metadata.full_name`. Photos go to a public `avatars` bucket. Pure form rules live in `profile.js` (tested), Supabase calls in `profileApi.js` (never throws), UI in `ProfileLayout.jsx` + `EditProfile.jsx`.

**Tech Stack:** React 18 + Vite, plain path routing (`App.jsx`, no React Router), Supabase JS (auth, Postgres with RLS, Storage), Vitest for pure functions, lucide-react 0.460 icons.

**Spec:** `docs/superpowers/specs/2026-10-16-profile-dashboard-design.md`

## Global Constraints

- SQL file is `backend/supabase/009_profiles.sql` (008 is taken by `008_moment_likes.sql`); run by hand in the Supabase SQL Editor; safe to re-run.
- Name: required, 1–80 characters (code points). City, country: optional, ≤ 60 characters.
- Phone: optional, info only (no SMS); 6–20 characters of digits, spaces, `+ ( ) -`, optional leading `+`, at least 6 digits; inner spaces collapsed.
- Password: ≥ 8 characters, must match the confirmation.
- Avatar: `avatars` bucket, public, JPEG only, ≤ 1 MB, path `<user id>/<random uuid>.jpg`, 400×400 centre-cropped square.
- Phone, city and country are readable only by the user and admins.
- Email changes go through `supabase.auth.updateUser({ email }, { emailRedirectTo: origin + '/app/profile' })`.
- Copy (exact): "Please enter your name.", "Name is too long (80 characters max).", "Please enter a valid phone number.", "City is too long (60 characters max).", "Country is too long (60 characters max).", "Please enter an email address.", "Please enter a valid email address.", "That's already your email.", "Password must be at least 8 characters.", "Passwords don't match.", "Couldn't read that photo.", "Couldn't save your photo. Please try again.", "Saved.", "Password updated.", "We sent a confirmation link to both your old and new email. Your email changes once you open it.", "Loading your profile…", "Couldn't load your profile. Please refresh the page.".
- `profileApi.js` functions never throw; they return `{ error }` or a value, like `momentsApi.js`.
- Tests: Vitest, pure functions only, `<module>.test.js` next to the module, `import { describe, expect, it } from 'vitest'`. Run from `frontend/`: `npx vitest run`.
- Match surrounding style: 2-space indent, no semicolons, single quotes, short "why" comments.

## Review Focus

1. A name of only spaces, or an 80-character emoji name → "Please enter your name." / accepted (code points, not UTF-16 units). Pinned in Task 2 tests.
2. Changing the email to the same address in different case → "That's already your email." Pinned in Task 2 tests.
3. Picking a PDF or broken image as profile photo → "Couldn't read that photo." and the old photo stays. Pinned as a manual check in Task 5.
4. Clicking Change photo / Save / Update again while a request runs → buttons disabled, no double upload. Pinned in Tasks 4–6 (disabled while busy) and the Task 5 manual check.
5. Profile page before `009_profiles.sql` has been run (no row / no table) → "Couldn't load your profile. Please refresh the page.", no crash. Pinned as a manual check in Task 4.

---

### Task 1: Database: `profiles` table, triggers, `avatars` bucket

**Files:**
- Create: `backend/supabase/009_profiles.sql`

**Interfaces:**
- Produces: table `public.profiles (id, full_name, phone, city, country, avatar_path, updated_at)`; users may `select` their own row and `update (full_name, phone, city, country, avatar_path)`; trigger copies `full_name` and `avatar_path` into `auth.users.raw_user_meta_data`; public bucket `avatars`.

- [ ] **Step 1: Write the SQL file**

Create `backend/supabase/009_profiles.sql`:

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

-- Keep updated_at fresh
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

-- Copy name and photo into the account, so the navbar, admin Users, reviews and moments see them
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

- [ ] **Step 2: Check it against the spec**

Read the spec's SQL block and the new file side by side and confirm every table, function, trigger, bucket and policy in the spec appears in the file (the plan's copy also adds two comments). No database is available to the implementer; the owner runs the file (see Task 7).

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/009_profiles.sql docs/superpowers/specs/2026-10-16-profile-dashboard-design.md
git commit -m "Profiles: table, triggers and avatars bucket (009_profiles.sql)"
```

---

### Task 2: Form rules in `profile.js` (TDD)

**Files:**
- Create: `frontend/src/profile.js`
- Test: `frontend/src/profile.test.js`

**Interfaces:**
- Consumes: `textLength(s)` from `frontend/src/reviews.js` (code-point length).
- Produces:
  - `PROFILE_LIMITS = { name: 80, place: 60, phoneMin: 6, phoneMax: 20, passwordMin: 8 }`
  - `COUNTRIES: string[]` (Tunisia first)
  - `profileForm(row) → { full_name, phone, city, country }` (strings)
  - `cleanProfile(form) → { values: { full_name, phone|null, city|null, country|null } } | { error: string }`
  - `profileChanged(row, form) → boolean`
  - `emailError(current, next) → string | null`
  - `passwordError(password, confirm) → string | null`
  - `avatarPath(userId, id) → string`
  - `linkNotice(hash) → { text, error? } | null`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/profile.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
  avatarPath, cleanProfile, COUNTRIES, emailError, linkNotice, passwordError, profileChanged, profileForm,
} from './profile.js'

const form = (over = {}) => ({ full_name: 'Leila Ben Ali', phone: '', city: '', country: '', ...over })
const row = (over = {}) => ({ id: 'u1', full_name: 'Leila Ben Ali', phone: null, city: null, country: null, avatar_path: null, ...over })

describe('profileForm', () => {
  it('turns empty columns into empty strings', () => {
    expect(profileForm(row({ city: 'Sfax' }))).toEqual({ full_name: 'Leila Ben Ali', phone: '', city: 'Sfax', country: '' })
  })
})

describe('cleanProfile', () => {
  it('trims fields and turns empty optional fields into null', () => {
    expect(cleanProfile(form({ full_name: '  Leila  ', city: ' Sfax ', country: '   ' }))).toEqual({
      values: { full_name: 'Leila', phone: null, city: 'Sfax', country: null },
    })
  })

  it('needs a name', () => {
    expect(cleanProfile(form({ full_name: '   ' }))).toEqual({ error: 'Please enter your name.' })
  })

  it('allows 80 characters of name, counting emoji as one', () => {
    expect(cleanProfile(form({ full_name: 'a'.repeat(80) })).values.full_name).toHaveLength(80)
    expect(cleanProfile(form({ full_name: '😀'.repeat(80) })).values).toBeDefined()
    expect(cleanProfile(form({ full_name: 'a'.repeat(81) }))).toEqual({ error: 'Name is too long (80 characters max).' })
  })

  it('accepts common phone formats and collapses spaces', () => {
    expect(cleanProfile(form({ phone: '+216 20 123 456' })).values.phone).toBe('+216 20 123 456')
    expect(cleanProfile(form({ phone: ' +216   20  123 456 ' })).values.phone).toBe('+216 20 123 456')
    expect(cleanProfile(form({ phone: '(71) 123-456' })).values.phone).toBe('(71) 123-456')
  })

  it('rejects invalid phones', () => {
    for (const phone of ['12', 'abc123456', '++21620123456', '------', '+216 (1) - -', '1'.repeat(21)]) {
      expect(cleanProfile(form({ phone }))).toEqual({ error: 'Please enter a valid phone number.' })
    }
  })

  it('limits city and country to 60 characters', () => {
    expect(cleanProfile(form({ city: 'a'.repeat(60), country: 'b'.repeat(60) })).values).toBeDefined()
    expect(cleanProfile(form({ city: 'a'.repeat(61) }))).toEqual({ error: 'City is too long (60 characters max).' })
    expect(cleanProfile(form({ country: 'b'.repeat(61) }))).toEqual({ error: 'Country is too long (60 characters max).' })
  })
})

describe('profileChanged', () => {
  it('is false when the cleaned form matches the saved row', () => {
    expect(profileChanged(row(), form())).toBe(false)
    expect(profileChanged(row({ city: 'Sfax' }), form({ full_name: ' Leila Ben Ali ', city: 'Sfax ' }))).toBe(false)
  })

  it('is true when a field differs', () => {
    expect(profileChanged(row(), form({ phone: '+216 20 123 456' }))).toBe(true)
    expect(profileChanged(row({ country: 'Tunisia' }), form())).toBe(true)
  })

  it('is true for an invalid form, so Save can show the error', () => {
    expect(profileChanged(row(), form({ full_name: '' }))).toBe(true)
  })
})

describe('emailError', () => {
  it('needs a valid, different address', () => {
    expect(emailError('a@x.com', '  ')).toBe('Please enter an email address.')
    expect(emailError('a@x.com', 'nope')).toBe('Please enter a valid email address.')
    expect(emailError('a@x.com', 'b@x')).toBe('Please enter a valid email address.')
    expect(emailError('a@x.com', ' A@X.com ')).toBe("That's already your email.")
  })

  it('accepts a new address', () => {
    expect(emailError('a@x.com', ' new@x.com ')).toBeNull()
  })
})

describe('passwordError', () => {
  it('needs 8 characters and a matching confirmation', () => {
    expect(passwordError('short', 'short')).toBe('Password must be at least 8 characters.')
    expect(passwordError('longenough', 'different')).toBe("Passwords don't match.")
    expect(passwordError('longenough', 'longenough')).toBeNull()
  })
})

describe('avatarPath', () => {
  it('puts the photo in the user folder', () => {
    expect(avatarPath('u1', 'p1')).toBe('u1/p1.jpg')
  })
})

describe('linkNotice', () => {
  it('reads the message or error an email link puts in the hash', () => {
    expect(linkNotice('#message=Confirmation+link+accepted')).toEqual({ text: 'Confirmation link accepted' })
    expect(linkNotice('#error=access_denied&error_description=Email+link+is+invalid')).toEqual({ text: 'Email link is invalid', error: true })
  })

  it('ignores other hashes', () => {
    expect(linkNotice('')).toBeNull()
    expect(linkNotice('#access_token=x&type=email_change')).toBeNull()
  })
})

describe('COUNTRIES', () => {
  it('starts with Tunisia and has no duplicates', () => {
    expect(COUNTRIES[0]).toBe('Tunisia')
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `frontend/`): `npx vitest run src/profile.test.js`
Expected: FAIL — `Failed to resolve import "./profile.js"`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/profile.js`:

```js
import { textLength } from './reviews.js'

// Edit profile form rules; 009_profiles.sql enforces the same limits.

export const PROFILE_LIMITS = { name: 80, place: 60, phoneMin: 6, phoneMax: 20, passwordMin: 8 }

// Suggestions for the Country field; any other text is allowed too
export const COUNTRIES = [
  'Tunisia', 'Algeria', 'Libya', 'Morocco', 'Egypt', 'France', 'Italy', 'Germany', 'Spain',
  'United Kingdom', 'United States', 'Canada', 'Belgium', 'Switzerland', 'Netherlands',
]

const PHONE = /^\+?[0-9 ()-]{6,20}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Database row → form values (inputs need strings, not null)
export const profileForm = (row) => ({
  full_name: row?.full_name ?? '',
  phone: row?.phone ?? '',
  city: row?.city ?? '',
  country: row?.country ?? '',
})

export function cleanProfile(form) {
  const name = form.full_name.trim()
  const phone = form.phone.trim().replace(/\s+/g, ' ')
  const city = form.city.trim()
  const country = form.country.trim()

  if (!name) return { error: 'Please enter your name.' }
  if (textLength(name) > PROFILE_LIMITS.name) return { error: 'Name is too long (80 characters max).' }
  if (phone && (!PHONE.test(phone) || phone.replace(/\D/g, '').length < PROFILE_LIMITS.phoneMin)) {
    return { error: 'Please enter a valid phone number.' }
  }
  if (textLength(city) > PROFILE_LIMITS.place) return { error: 'City is too long (60 characters max).' }
  if (textLength(country) > PROFILE_LIMITS.place) return { error: 'Country is too long (60 characters max).' }

  return { values: { full_name: name, phone: phone || null, city: city || null, country: country || null } }
}

// Drives the Save button; an invalid form counts as changed so Save can show why
export function profileChanged(row, form) {
  const { values } = cleanProfile(form)
  if (!values) return true
  return Object.keys(values).some((key) => values[key] !== (row?.[key] ?? null))
}

export function emailError(current, next) {
  const email = next.trim()
  if (!email) return 'Please enter an email address.'
  if (!EMAIL.test(email)) return 'Please enter a valid email address.'
  if (email.toLowerCase() === (current ?? '').toLowerCase()) return "That's already your email."
  return null
}

export function passwordError(password, confirm) {
  if (password.length < PROFILE_LIMITS.passwordMin) return 'Password must be at least 8 characters.'
  if (password !== confirm) return "Passwords don't match."
  return null
}

export const avatarPath = (userId, id) => `${userId}/${id}.jpg`

// Email-change links come back to /app/profile with a message or an error in the hash
export function linkNotice(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const error = params.get('error_description')
  if (error) return { text: error, error: true }
  const message = params.get('message')
  return message ? { text: message } : null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (in `frontend/`): `npx vitest run`
Expected: PASS — all files, including `profile.test.js`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/profile.js frontend/src/profile.test.js
git commit -m "Profile: form rules for Edit profile"
```

---

### Task 3: Square photo resize and `profileApi.js`

**Files:**
- Modify: `frontend/src/imageResize.js` (add `resizeToSquareJpeg`, share the JPEG encoding)
- Create: `frontend/src/profileApi.js`

**Interfaces:**
- Consumes: `avatarPath` from `profile.js`; `supabase` from `supabase.js`; `openPhoto` (private, same file).
- Produces:
  - `resizeToSquareJpeg(file, size = 400, quality = 0.85) → Promise<Blob>` (throws if the photo can't be read)
  - `avatarUrl(path) → string | null`
  - `fetchProfile(userId) → { profile } | { error: true }`
  - `saveProfile(userId, values) → { profile } | { error: string }`
  - `uploadAvatar(userId, file, oldPath) → { profile } | { error: string }`
  - `removeAvatar(userId, oldPath) → { profile } | { error: string }`
  - `changeEmail(email) → { ok: true } | { error: string }`
  - `changePassword(password) → { ok: true } | { error: string }`
  - `profile` objects have `{ id, full_name, phone, city, country, avatar_path }`.

These use browser and network APIs, so there are no unit tests (the project has no jsdom); the build checks them and Tasks 5–6 exercise them in the browser.

- [ ] **Step 1: Add the square resize**

In `frontend/src/imageResize.js`, replace everything from `// Shrinks a photo to a JPEG before upload` to the end of the file with:

```js
async function canvasToJpeg(canvas, quality) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not encode the photo')
  return blob
}

// Shrinks a photo to a JPEG before upload, so phone photos stay well under the 2 MB bucket limit.
export async function resizeToJpeg(file, maxSide = 1600, quality = 0.85) {
  const bitmap = await openPhoto(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  // Transparent PNGs get a white background instead of black
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvasToJpeg(canvas, quality)
}

// Profile photos: the centred square of the photo, size × size (about 30 KB at 400 px).
export async function resizeToSquareJpeg(file, size = 400, quality = 0.85) {
  const bitmap = await openPhoto(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close?.()
  return canvasToJpeg(canvas, quality)
}
```

- [ ] **Step 2: Create `profileApi.js`**

Create `frontend/src/profileApi.js`:

```js
import { supabase } from './supabase.js'
import { resizeToSquareJpeg } from './imageResize.js'
import { avatarPath } from './profile.js'

// Profile row, photo and account changes in Supabase. None of these throw: pages get a plain value back.

const BUCKET = 'avatars'
const COLUMNS = 'id, full_name, phone, city, country, avatar_path'
const saveFailed = "Couldn't save your changes. Please try again."
const photoFailed = "Couldn't save your photo. Please try again."
const accountFailed = "Couldn't update your account. Please try again."

// Photos are public; the random file name changes with every upload, so caches never show an old one
export function avatarUrl(path) {
  if (!supabase || !path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// A trigger copies name and photo into the account; a fresh session brings them to the navbar
const refreshSession = () => supabase.auth.refreshSession().catch(() => {})

const updateRow = async (userId, values) => {
  const { data, error } = await supabase.from('profiles').update(values).eq('id', userId).select(COLUMNS).maybeSingle()
  return error || !data ? null : data
}

const removeFile = (path) => supabase.storage.from(BUCKET).remove([path]).catch(() => {})

export async function fetchProfile(userId) {
  if (!supabase) return { error: true }
  try {
    const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle()
    return error || !data ? { error: true } : { profile: data }
  } catch {
    return { error: true }
  }
}

export async function saveProfile(userId, values) {
  if (!supabase) return { error: saveFailed }
  try {
    const profile = await updateRow(userId, values)
    if (!profile) return { error: saveFailed }
    await refreshSession()
    return { profile }
  } catch {
    return { error: saveFailed }
  }
}

export async function uploadAvatar(userId, file, oldPath) {
  if (!supabase) return { error: photoFailed }
  let blob
  try {
    blob = await resizeToSquareJpeg(file)
  } catch {
    // Not an image, a damaged file, or HEIC the browser can't convert
    return { error: "Couldn't read that photo." }
  }

  const path = avatarPath(userId, crypto.randomUUID())
  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) return { error: photoFailed }
    const profile = await updateRow(userId, { avatar_path: path })
    if (!profile) {
      await removeFile(path)
      return { error: photoFailed }
    }
    if (oldPath) await removeFile(oldPath)
    await refreshSession()
    return { profile }
  } catch {
    return { error: photoFailed }
  }
}

export async function removeAvatar(userId, oldPath) {
  if (!supabase) return { error: photoFailed }
  try {
    const profile = await updateRow(userId, { avatar_path: null })
    if (!profile) return { error: photoFailed }
    if (oldPath) await removeFile(oldPath)
    await refreshSession()
    return { profile }
  } catch {
    return { error: photoFailed }
  }
}

// Supabase's own messages explain rate limits and "same password", so they are shown as they are
export async function changeEmail(email) {
  if (!supabase) return { error: accountFailed }
  try {
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/app/profile` })
    return error ? { error: error.message } : { ok: true }
  } catch {
    return { error: accountFailed }
  }
}

export async function changePassword(password) {
  if (!supabase) return { error: accountFailed }
  try {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { error: error.message } : { ok: true }
  } catch {
    return { error: accountFailed }
  }
}
```

- [ ] **Step 3: Verify tests and build**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all tests PASS; build ends with `✓ built in …` and no errors. (Moments still use `resizeToJpeg`, unchanged in behaviour.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/imageResize.js frontend/src/profileApi.js
git commit -m "Profile: square photo resize and Supabase calls"
```

---

### Task 4: Dashboard layout, routing and the Personal details card

**Files:**
- Create: `frontend/src/sections/ProfileLayout.jsx`
- Create: `frontend/src/pages/EditProfile.jsx`
- Delete: `frontend/src/pages/Profile.jsx`
- Modify: `frontend/src/App.jsx` (imports; `appPages['/app/profile']`)
- Modify: `frontend/src/data.js` (add `profileNavLinks` after `adminNavLinks`)
- Modify: `frontend/src/styles.css` (new "Profile dashboard" block after the Admin block's last rule, before the first `@media (max-width: 575px)` at ~line 1016)

**Interfaces:**
- Consumes: `fetchProfile`, `saveProfile` (Task 3); `cleanProfile`, `profileChanged`, `profileForm`, `COUNTRIES` (Task 2); `displayName` from `names.js`; `currentPath` from `route.js`.
- Produces: `ProfileLayout({ user, children })`; `EditProfile({ user })` containing `Notice({ notice })` and `DetailsCard({ user, profile, onSaved })`, with a `profile-cards` container that Tasks 5–6 add cards to.

- [ ] **Step 1: Add the sidebar links**

In `frontend/src/data.js`, after the closing `]` of `adminNavLinks`, add:

```js

// Sidebar of the profile dashboard (/app/profile); sections are added as they're built.
export const profileNavLinks = [
  ['Edit profile', '/app/profile'],
]
```

- [ ] **Step 2: Create the layout**

Create `frontend/src/sections/ProfileLayout.jsx`:

```jsx
import { useState } from 'react'
import { Menu, UserPen, X } from 'lucide-react'
import { profileNavLinks } from '../data.js'
import { displayName } from '../names.js'
import { currentPath } from '../route.js'

const icons = { '/app/profile': UserPen }

// Sidebar + content for /app/profile pages, under the app navbar; on phones the links fold behind a button.
export default function ProfileLayout({ user, children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className="page-banner page-banner--short">
        <div className="container">
          <h1>{displayName(user)}</h1>
          <p>{user.email}</p>
        </div>
      </section>

      <div className="container profile-dash">
        <aside className="profile-side">
          <button type="button" className="profile-menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />} Profile menu
          </button>
          <nav className={`profile-nav ${open ? 'profile-nav--open' : ''}`} aria-label="Profile">
            {profileNavLinks.map(([label, href]) => {
              const Icon = icons[href]
              const active = href === currentPath
              return (
                <a key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                  {Icon && <Icon size={18} />} {label}
                </a>
              )
            })}
          </nav>
        </aside>

        <div className="profile-main">{children}</div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Create the page with the Personal details card**

Create `frontend/src/pages/EditProfile.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { COUNTRIES, cleanProfile, profileChanged, profileForm } from '../profile.js'
import { fetchProfile, saveProfile } from '../profileApi.js'

// Message under a card's button: { text, error? }
function Notice({ notice }) {
  if (!notice) return null
  return (
    <p className={`profile-note ${notice.error ? 'profile-note--error' : ''}`} role={notice.error ? 'alert' : 'status'}>
      {notice.text}
    </p>
  )
}

function DetailsCard({ user, profile, onSaved }) {
  const [form, setForm] = useState(() => profileForm(profile))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setNotice(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    const { values, error } = cleanProfile(form)
    if (error) return setNotice({ text: error, error: true })
    setBusy(true)
    const result = await saveProfile(user.id, values)
    setBusy(false)
    if (result.error) return setNotice({ text: result.error, error: true })
    onSaved(result.profile)
    setForm(profileForm(result.profile))
    setNotice({ text: 'Saved.' })
  }

  return (
    <section className="profile-card">
      <h2>Personal details</h2>
      <form onSubmit={submit} noValidate>
        <fieldset className="auth-form" disabled={busy}>
          <label className="auth-field">
            Full name
            <input name="full_name" autoComplete="name" value={form.full_name} onChange={set('full_name')} />
          </label>
          <label className="auth-field">
            Phone
            <input type="tel" name="phone" autoComplete="tel" placeholder="+216 20 123 456" value={form.phone} onChange={set('phone')} />
          </label>
          <div className="profile-row">
            <label className="auth-field">
              City
              <input name="city" autoComplete="address-level2" value={form.city} onChange={set('city')} />
            </label>
            <label className="auth-field">
              Country
              <input name="country" autoComplete="country-name" list="profile-countries" value={form.country} onChange={set('country')} />
            </label>
          </div>
          <datalist id="profile-countries">
            {COUNTRIES.map((c) => <option key={c} value={c} />)}
          </datalist>
          <button type="submit" className="btn btn--primary profile-card__submit" disabled={!profileChanged(profile, form)}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}

export default function EditProfile({ user }) {
  // undefined while loading, null if loading failed
  const [profile, setProfile] = useState(undefined)
  const userId = user.id

  useEffect(() => {
    document.title = 'Edit profile - Aaslema'
  }, [])

  useEffect(() => {
    let live = true
    fetchProfile(userId).then((result) => {
      if (live) setProfile(result.profile ?? null)
    })
    return () => { live = false }
  }, [userId])

  return (
    <>
      <h1>Edit profile</h1>
      {profile === undefined && <p className="profile-note">Loading your profile…</p>}
      {profile === null && <p className="profile-note profile-note--error" role="alert">Couldn't load your profile. Please refresh the page.</p>}
      {profile && (
        <div className="profile-cards">
          <DetailsCard user={user} profile={profile} onSaved={setProfile} />
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Route `/app/profile` to the dashboard**

In `frontend/src/App.jsx`:

Replace `import Profile from './pages/Profile.jsx'` with:

```jsx
import EditProfile from './pages/EditProfile.jsx'
import ProfileLayout from './sections/ProfileLayout.jsx'
```

Replace the `appPages` definition (both lines) with:

```jsx
// Profile dashboard: sidebar layout around the active section
const ProfilePage = (props) => <ProfileLayout {...props}><EditProfile {...props} /></ProfileLayout>
// Signed-in area; keys must match appPagePaths in redirects.js
const appPages = { '/app': AppHome, '/app/destinations': Destinations, '/app/festivals': Festivals, '/app/community': Community, '/app/review': Review, '/app/contact': Contact,
 '/app/planner': Planner, '/app/profile': ProfilePage }
```

(Keep the existing `// Signed-in area…` comment only once — the block above replaces it.)

Then delete the placeholder: `git rm frontend/src/pages/Profile.jsx`

- [ ] **Step 5: Add the styles**

In `frontend/src/styles.css`, insert before the first `@media (max-width: 575px) {` that follows the Admin block (the one containing `.admin-moment { grid-template-columns: 1fr; }`):

```css
/* ---------- Profile dashboard ---------- */
.page-banner--short { padding: 150px 0 50px; }
.page-banner--short h1 { font-size: 40px; overflow-wrap: anywhere; }
.profile-dash { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 32px; align-items: start; padding-top: 40px; padding-bottom: 80px; }
.profile-side { position: sticky; top: 100px; padding: 14px; background: var(--heading); border-radius: var(--radius); }
.profile-nav { display: flex; flex-direction: column; gap: 4px; }
.profile-nav a { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--white); font-weight: 500; }
.profile-nav a:hover { background: rgba(255, 255, 255, 0.06); }
.profile-nav a.active { background: var(--primary); }
.profile-menu-toggle {
  display: none; align-items: center; gap: 8px; width: 100%; padding: 6px 4px; border: 0;
  background: none; color: var(--white); font: inherit; font-weight: 600; cursor: pointer;
}
.profile-main { min-width: 0; }
.profile-main h1 { margin-bottom: 24px; color: var(--title); font-size: 32px; }
.profile-cards { display: grid; gap: 20px; max-width: 640px; }
.profile-card { padding: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.profile-card h2 { margin: 0 0 16px; color: var(--title); font-size: 20px; }
.profile-card__lead { margin: 0 0 12px; font-size: 15px; }
.profile-card__lead strong { color: var(--title); overflow-wrap: anywhere; }
.profile-card__submit { justify-self: start; }
.profile-card__submit:disabled, .profile-photo__actions .btn:disabled { opacity: 0.6; cursor: default; }
.profile-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.profile-note { margin: 12px 0 0; font-size: 15px; color: var(--text); }
.profile-note--error { color: #c0392b; }
@media (max-width: 991px) {
  .profile-dash { grid-template-columns: 1fr; gap: 20px; }
  .profile-side { position: static; }
  .profile-menu-toggle { display: flex; }
  .profile-nav { display: none; padding-top: 10px; }
  .profile-nav--open { display: flex; }
}
@media (max-width: 575px) {
  .profile-row { grid-template-columns: 1fr; }
  .profile-card { padding: 18px; }
}
```

- [ ] **Step 6: Verify tests and build**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all PASS; build succeeds (no "Could not resolve ./pages/Profile.jsx").

- [ ] **Step 7: Browser check (if a browser and Supabase with 009 are available; otherwise list it for the owner in Task 7)**

Run `npm run dev` in `frontend/`, sign in, open `/app/profile`:
- banner with name and email; sidebar with "Edit profile" highlighted; "Personal details" card.
- Save is disabled until a field changes; clear the name → "Please enter your name."; phone `12` → "Please enter a valid phone number."; valid values → "Saved."; refresh keeps them; navbar initials follow a new name.
- At < 992px width the sidebar shows a "Profile menu" button that opens the links.
- Review Focus 5: before 009 is run, the page shows "Couldn't load your profile. Please refresh the page." (no crash).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/sections/ProfileLayout.jsx frontend/src/pages/EditProfile.jsx frontend/src/App.jsx frontend/src/data.js frontend/src/styles.css
git commit -m "Profile: dashboard layout and Personal details"
```

(`git rm` in Step 4 already staged the deletion.)

---

### Task 5: Profile photo card and photo in the navbar

**Files:**
- Modify: `frontend/src/pages/EditProfile.jsx` (add `PhotoCard`, render it first)
- Modify: `frontend/src/sections/AppHeader.jsx` (photo in the circle)
- Modify: `frontend/src/styles.css` (photo styles, in the Profile dashboard block)

**Interfaces:**
- Consumes: `avatarUrl`, `uploadAvatar`, `removeAvatar` (Task 3); `initials` from `names.js`; `Notice` (Task 4).
- Produces: `PhotoCard({ user, profile, onSaved })`.

- [ ] **Step 1: Add the photo card**

In `frontend/src/pages/EditProfile.jsx`:

Change the first import line to `import { useEffect, useRef, useState } from 'react'`, and the `profileApi.js` import to:

```jsx
import { avatarUrl, fetchProfile, removeAvatar, saveProfile, uploadAvatar } from '../profileApi.js'
import { initials } from '../names.js'
```

Add after the `Notice` function:

```jsx
function PhotoCard({ user, profile, onSaved }) {
  const input = useRef(null)
  // 'upload' or 'remove' while saving
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const url = avatarUrl(profile.avatar_path)

  const run = async (kind, action) => {
    setBusy(kind)
    setNotice(null)
    const result = await action()
    setBusy(null)
    if (result.error) return setNotice({ text: result.error, error: true })
    onSaved(result.profile)
  }

  const pick = (e) => {
    const file = e.target.files?.[0]
    // Cleared so picking the same file again still uploads
    e.target.value = ''
    if (file) run('upload', () => uploadAvatar(user.id, file, profile.avatar_path))
  }

  return (
    <section className="profile-card">
      <h2>Profile photo</h2>
      <div className="profile-photo">
        {url
          ? <img src={url} alt="Your profile photo" className="profile-photo__img" />
          : <span className="profile-photo__initials" aria-hidden="true">{initials(profile.full_name)}</span>}
        <div className="profile-photo__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => input.current?.click()} disabled={busy !== null}>
            {busy === 'upload' ? 'Uploading…' : 'Change photo'}
          </button>
          {profile.avatar_path && (
            <button type="button" className="btn btn--sm admin-btn-outline" onClick={() => run('remove', () => removeAvatar(user.id, profile.avatar_path))} disabled={busy !== null}>
              {busy === 'remove' ? 'Removing…' : 'Remove photo'}
            </button>
          )}
          <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={pick} />
        </div>
      </div>
      <Notice notice={notice} />
    </section>
  )
}
```

In `EditProfile`, render it first inside `profile-cards`:

```jsx
        <div className="profile-cards">
          <PhotoCard user={user} profile={profile} onSaved={setProfile} />
          <DetailsCard user={user} profile={profile} onSaved={setProfile} />
        </div>
```

- [ ] **Step 2: Photo in the navbar**

In `frontend/src/sections/AppHeader.jsx`, add `import { avatarUrl } from '../profileApi.js'` after the `names.js` import. After `const name = …` add:

```jsx
  // Copied into the account by 009_profiles.sql whenever the profile photo changes
  const photo = avatarUrl(user.user_metadata?.avatar_path)
```

Replace the profile link block with:

```jsx
          <a href="/app/profile" className={`app-user ${currentPath.startsWith('/app/profile') ? 'app-user--active' : ''}`} title={name} aria-label={`Profile (${name})`}>
            {photo
              ? <img src={photo} alt="" className="app-user__avatar app-user__avatar--img" />
              : <span className="app-user__avatar" aria-hidden="true">{initials(name)}</span>}
          </a>
```

(The link's `aria-label` already names the user, so the image itself has empty alt text.)

- [ ] **Step 3: Photo styles**

In `frontend/src/styles.css`, add to the Profile dashboard block, just before its `@media (max-width: 991px)`:

```css
.profile-photo { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
.profile-photo__img, .profile-photo__initials { width: 96px; height: 96px; border-radius: 50%; flex-shrink: 0; }
.profile-photo__img { object-fit: cover; background: var(--lighter); }
.profile-photo__initials { display: grid; place-items: center; background: var(--primary); color: var(--white); font-size: 32px; font-weight: 700; }
.profile-photo__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.app-user__avatar--img { object-fit: cover; }
```

- [ ] **Step 4: Verify tests and build**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all PASS; build succeeds.

- [ ] **Step 5: Browser check (or list for the owner in Task 7)**

- Change photo with a large phone photo → "Uploading…", then a square photo in the card and the navbar; Storage `avatars/<user id>/` keeps only the newest file.
- An iPhone HEIC photo uploads the same way.
- Review Focus 3: pick a PDF (choose "All files" in the picker) → "Couldn't read that photo."; the old photo stays.
- Review Focus 4: both buttons are disabled while uploading.
- Remove photo → initials in the card and navbar; the file is gone from Storage.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/EditProfile.jsx frontend/src/sections/AppHeader.jsx frontend/src/styles.css
git commit -m "Profile: photo upload and photo in the navbar"
```

---

### Task 6: Email and Password cards

**Files:**
- Modify: `frontend/src/pages/EditProfile.jsx`

**Interfaces:**
- Consumes: `changeEmail`, `changePassword` (Task 3); `emailError`, `passwordError`, `linkNotice` (Task 2); `Notice` (Task 4).
- Produces: `EmailCard({ user, initialNotice })`, `PasswordCard()`.

- [ ] **Step 1: Imports**

In `frontend/src/pages/EditProfile.jsx`, change the `profile.js` and `profileApi.js` imports to:

```jsx
import { COUNTRIES, cleanProfile, emailError, linkNotice, passwordError, profileChanged, profileForm } from '../profile.js'
import { avatarUrl, changeEmail, changePassword, fetchProfile, removeAvatar, saveProfile, uploadAvatar } from '../profileApi.js'
```

- [ ] **Step 2: Add the two cards**

Add after `DetailsCard`:

```jsx
function EmailCard({ user, initialNotice }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(initialNotice)

  const submit = async (e) => {
    e.preventDefault()
    const error = emailError(user.email, email)
    if (error) return setNotice({ text: error, error: true })
    setBusy(true)
    const result = await changeEmail(email.trim())
    setBusy(false)
    if (result.error) return setNotice({ text: result.error, error: true })
    setEmail('')
    setNotice({ text: 'We sent a confirmation link to both your old and new email. Your email changes once you open it.' })
  }

  return (
    <section className="profile-card">
      <h2>Email</h2>
      <p className="profile-card__lead">Current email: <strong>{user.email}</strong></p>
      {user.new_email && <p className="profile-card__lead">Waiting for you to confirm <strong>{user.new_email}</strong>.</p>}
      <form onSubmit={submit} noValidate>
        <fieldset className="auth-form" disabled={busy}>
          <label className="auth-field">
            New email
            <input type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setNotice(null) }} />
          </label>
          <button type="submit" className="btn btn--primary profile-card__submit">{busy ? 'Sending…' : 'Change email'}</button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}

function PasswordCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const error = passwordError(password, confirm)
    if (error) return setNotice({ text: error, error: true })
    setBusy(true)
    const result = await changePassword(password)
    setBusy(false)
    if (result.error) return setNotice({ text: result.error, error: true })
    setPassword('')
    setConfirm('')
    setNotice({ text: 'Password updated.' })
  }

  const field = (setter) => (e) => { setter(e.target.value); setNotice(null) }

  return (
    <section className="profile-card">
      <h2>Password</h2>
      <form onSubmit={submit} noValidate>
        <fieldset className="auth-form" disabled={busy}>
          <label className="auth-field">
            New password
            <input type="password" name="new-password" autoComplete="new-password" value={password} onChange={field(setPassword)} />
            <small>At least 8 characters.</small>
          </label>
          <label className="auth-field">
            Confirm password
            <input type="password" name="confirm-password" autoComplete="new-password" value={confirm} onChange={field(setConfirm)} />
          </label>
          <button type="submit" className="btn btn--primary profile-card__submit">{busy ? 'Updating…' : 'Update password'}</button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}
```

- [ ] **Step 3: Read the email-link message and render the cards**

In `EditProfile`, after `const userId = user.id` add:

```jsx
  // Read once: email-change links land here with a message or an error in the hash
  const [emailNotice] = useState(() => linkNotice(window.location.hash))
```

After the `document.title` effect add:

```jsx
  // Drop the link's hash so a refresh doesn't show the message again
  useEffect(() => {
    if (emailNotice) window.history.replaceState(null, '', window.location.pathname)
  }, [emailNotice])
```

Render all four cards:

```jsx
        <div className="profile-cards">
          <PhotoCard user={user} profile={profile} onSaved={setProfile} />
          <DetailsCard user={user} profile={profile} onSaved={setProfile} />
          <EmailCard user={user} initialNotice={emailNotice} />
          <PasswordCard />
        </div>
```

- [ ] **Step 4: Verify tests and build**

Run (in `frontend/`): `npx vitest run` then `npx vite build`
Expected: all PASS; build succeeds.

- [ ] **Step 5: Browser check (or list for the owner in Task 7)**

- Email: same address in capitals → "That's already your email."; a new address → the "We sent a confirmation link…" message and "Waiting for you to confirm …"; opening a link lands on `/app/profile` with Supabase's message in the Email card and a clean URL.
- Password: `short` → "Password must be at least 8 characters."; mismatch → "Passwords don't match."; valid → "Password updated."; sign out and in with the new password.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/EditProfile.jsx
git commit -m "Profile: change email and password"
```

---

### Task 7: Final check and checkpoint

**Files:**
- Modify: `CHECKPOINT.md`

- [ ] **Step 1: Full verification**

Run (in `frontend/`): `npx vitest run` and `npx vite build`
Expected: every test file passes (previous count + `profile.test.js`); build succeeds. Record the exact test count.

- [ ] **Step 2: Update `CHECKPOINT.md`**

- "Last updated" → today's date and the last commit hash.
- State: test count; SQL list now `001`–`009`, add `009_profiles.sql` to the "have been applied" list.
- Waiting on you: run `009_profiles.sql`; add `<site>/app/profile` to Supabase Auth → URL Configuration → Redirect URLs; the "Manual (owner)" list in `docs/superpowers/specs/2026-10-16-profile-dashboard-design.md`, plus any browser checks from Tasks 4–6 that could not be done.
- Done table: row "Profile dashboard: Edit profile (name, phone, city, country, photo, email, password); photo in the navbar" | `2026-10-16-profile-dashboard` | first – last commit of this plan.
- Next: replace item 3 ("Profile: …") with "Profile: more sidebar sections (Places I've visited, My moments, My reviews, My posts); public name + photo for Feed / reviews / moments".

- [ ] **Step 3: Commit**

```bash
git add CHECKPOINT.md
git commit -m "Checkpoint: profile dashboard"
```
