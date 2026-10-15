# Admin dashboard, part 2: contact messages — design

Date: 2026-10-15
Status: approved in brainstorming, awaiting spec review

## Goal

Messages sent from the Contact form are saved in Supabase. Admins read them
on a new Messages page in the admin dashboard, mark them handled (or back to
new), and reply from their own email app.

Builds on part 1 (`docs/superpowers/specs/2026-10-15-admin-users-design.md`):
`public.is_admin()`, the `/admin` area, `AdminLayout`, `redirectFor`.

## Decisions

| Question | Decision |
|---|---|
| Who can send | Anyone, signed in or not |
| Signed-in senders | Name and email prefilled (editable); message linked to their account |
| Admin actions | Read, mark handled / mark as new, reply via `mailto:` |
| Delete | Not from the site (Supabase table editor only) |
| Data access | Table + row level security; reads and updates admin-only |
| Spam | Hidden honeypot field + database length/format limits; no rate limiting yet |

## Database

New file `backend/supabase/003_contact_messages.sql`, run once in the
Supabase SQL Editor after 001 and 002; safe to re-run.

```sql
-- Contact form messages. Anyone can send; only admins can read or mark them.
-- Run after 001_admin_users.sql (uses public.is_admin()). Safe to re-run.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (
    char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  subject text check (subject is null or char_length(subject) <= 150),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  user_id uuid references auth.users (id) on delete set null,
  handled_at timestamptz
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Column-level grants: senders can only fill these columns; admins can only change handled_at.
revoke all on public.contact_messages from anon, authenticated;
grant insert (name, email, subject, message, user_id) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update (handled_at) on public.contact_messages to authenticated;

drop policy if exists "Anyone can send a message" on public.contact_messages;
create policy "Anyone can send a message" on public.contact_messages
  for insert to anon, authenticated
  with check (handled_at is null and (user_id is null or user_id = auth.uid()));

drop policy if exists "Admins can read messages" on public.contact_messages;
create policy "Admins can read messages" on public.contact_messages
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can mark messages" on public.contact_messages;
create policy "Admins can mark messages" on public.contact_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

Notes:
- No delete grant or policy: nobody can delete from the site.
- Senders cannot read their own message back, so the form inserts without
  asking for the row back (`insert(...)` with no `.select()`).
- `user_id` must be empty or the sender's own id — nobody can attach a
  message to someone else's account.
- `subject` is stored as `null` when left empty.

## Contact form

`src/pages/Contact.jsx` (the same component at `/contact` and
`/app/contact`; `App` passes `user`, which is `null` on the public page).

- Signed-in user: name input defaults to `user.user_metadata.full_name`
  (or empty), email to `user.email`; both editable. The row gets
  `user_id = user.id`.
- Hidden honeypot input `website` (visually hidden, `tabIndex={-1}`,
  `autoComplete="off"`, `aria-hidden`). If filled: show the normal success
  message, save nothing.
- Validation before sending, with the same limits as the database (see
  `contactMessage.js`); the first problem is shown as the error message.
- While sending: inputs disabled, button text "Sending…".
- Success: "Thanks! We got your message and usually reply within a day."
  Form clears (a signed-in user's name/email go back to their defaults).
- Failure (Supabase error, network error, or Supabase not configured):
  "Couldn't send your message. Please try again, or email us at
  {brand.email}." Typed text stays.
- The old comment "No backend yet: the form only confirms locally." and
  the old success text go.

### `src/contactMessage.js` (pure, tested)

`messageFromForm(fields, user)` where `fields` is
`{ name, email, subject, message, website }` (strings) and `user` is the
Supabase user or `null`. Returns one of:
- `{ spam: true }` — `website` is non-empty after trimming
- `{ error: '<message>' }` — first failing check, in this order:
  - name empty after trim → "Please enter your name."
  - name over 100 characters (after trim) → "Your name is too long (100 characters max)."
  - email empty or not matching `^[^@\s]+@[^@\s]+\.[^@\s]+$` or over 254 → "Please enter a valid email address."
  - subject over 150 (after trim) → "Your subject is too long (150 characters max)."
  - message empty after trim → "Please write a message."
  - message over 5000 (after trim) → "Your message is too long (5000 characters max)."
- `{ row: { name, email, subject, message, user_id } }` — values trimmed;
  `subject` is `null` when empty; `user_id` is `user?.id ?? null`.

## Admin Messages page

### Routing and sidebar

- `adminPagePaths` becomes `['/admin', '/admin/messages']`.
- `adminNavLinks` gains `['Messages', '/admin/messages']` (after Users).
- `App.jsx` `adminPages` gains `'/admin/messages': AdminMessages`.
- `AdminLayout` shows the number of new messages next to "Messages" when it
  is above 0 (`admin-nav__count` badge). It loads the count on mount with
  `supabase.from('contact_messages').select('id', { count: 'exact', head: true }).is('handled_at', null)`
  and reloads it whenever the window receives the custom event
  `admin:messages-changed`. Errors loading the count are ignored (no badge).

### `src/pages/admin/AdminMessages.jsx`

- On mount: `supabase.from('contact_messages').select('*').order('created_at', { ascending: false })`;
  `document.title` = `Messages - Aaslema Admin`.
- Tabs "New (n)", "Handled (n)", "All (n)"; default New. Counts from
  `messageCounts`.
- List of rows (button elements for keyboard access). Each shows: name,
  email, `messagePreview` of subject-or-message, `lastSeen(created_at)`
  ("2h ago" style, reused from `adminUsers.js`), and a "Signed-in user"
  tag when `user_id` is set.
- Clicking a row opens it in place (one open at a time; clicking again
  closes it): full message with line breaks kept, the received date and
  time, and two buttons:
  - **Reply** — a link to `replyHref(message)`.
  - **Mark handled** (when new) / **Mark as new** (when handled):
    `supabase.from('contact_messages').update({ handled_at: <now ISO> | null }).eq('id', id)`.
    On success: update the message in local state and dispatch
    `window.dispatchEvent(new Event('admin:messages-changed'))`. On failure:
    keep the status and show "Couldn't update this message. Try again." on
    that message. The button is disabled while the request runs.
- Empty states: New tab with nothing new → "No new messages."; other tabs
  empty → "No messages here."
- Load errors: code `42501` → "Your session doesn't have admin rights yet.
  Sign out and sign in again."; anything else → "Couldn't load messages:
  {message}" + "Try again".

Note: with row level security, a non-admin's select returns an empty list
rather than an error. That cannot happen in practice (the page is
admin-only), so no special message is needed.

### `src/adminMessages.js` (pure, tested)

- `isHandled(m)` — `Boolean(m.handled_at)`.
- `filterByStatus(messages, status)` — `status` is `'new' | 'handled' | 'all'`.
- `messageCounts(messages)` → `{ new, handled, all }`.
- `messagePreview(m, max = 80)` — the subject if present, else the message
  with whitespace collapsed; cut at `max` characters with `…` appended when
  longer.
- `replyHref(m)` — `mailto:` + the address (URI-encoded) +
  `?subject=` + URI-encoded `Re: <subject>` (or `Re: Your message to Aaslema`
  when there is no subject).

## Files

New:
- `backend/supabase/003_contact_messages.sql`
- `frontend/src/contactMessage.js` + `contactMessage.test.js`
- `frontend/src/adminMessages.js` + `adminMessages.test.js`
- `frontend/src/pages/admin/AdminMessages.jsx`

Changed:
- `frontend/src/pages/Contact.jsx` — saving, prefill, honeypot, states
- `frontend/src/redirects.js` + test — `/admin/messages`
- `frontend/src/data.js` — `adminNavLinks`
- `frontend/src/sections/AdminLayout.jsx` — Messages link icon, new-count badge
- `frontend/src/App.jsx` — `adminPages`
- `frontend/src/styles.css` — honeypot hiding, contact error state, messages page, nav count badge
- `backend/README.md` — add step 3

## Testing

- **Vitest:**
  - `contactMessage.test.js` — each error message and its boundary
    (100/101 name, 150/151 subject, 5000/5001 message, 254/255 email),
    email format cases, trimming, empty subject → `null`, honeypot,
    `user_id` from a user and `null` without one.
  - `adminMessages.test.js` — filtering and counts, preview cut and
    whitespace collapsing, reply link with special characters
    (`&`, `?`, spaces, non-ASCII) and without a subject.
  - `redirects.test.js` — `/admin/messages` allowed for admins, sent to
    `/app` for non-admins and `/signin` when signed out.
- **SQL:** checked by reading; the owner runs it.
- **Manual (owner):**
  1. Run `003_contact_messages.sql` in the SQL Editor.
  2. Signed out, send a message from `/contact` → success text; form clears.
  3. Signed in as a normal user, `/app/contact` shows your name and email; send.
  4. As admin, the sidebar shows "Messages 2"; the page lists both, the
     second with "Signed-in user".
  5. Open one, Mark handled → it moves to Handled, the counts and the
     sidebar badge update; Mark as new moves it back.
  6. Reply opens your email app to the sender with "Re: …".
  7. Fill the hidden field via the browser dev tools and send → success
     text, but no new row.
  8. In the SQL Editor, as a check that the database protects the data:
     `set role anon; select * from public.contact_messages;` → "permission
     denied"; then `reset role;`.

## Future work

- Rate limiting (e.g. an Edge Function or a per-IP/email throttle).
- Delete / archive from the dashboard.
- Email notification to the admin when a message arrives.
