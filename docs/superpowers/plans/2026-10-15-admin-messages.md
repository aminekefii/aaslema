# Admin Dashboard Part 2 (Contact Messages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save Contact form messages in Supabase and let admins read them, mark them handled or new, and reply by email from a Messages page in the admin dashboard.

**Architecture:** A `public.contact_messages` table with row level security and column-level grants: anyone may insert the message columns, only admins (`public.is_admin()` from part 1) may read or change `handled_at`. The Contact page inserts through `supabase.from(...).insert()` after a pure, tested `messageFromForm`. The admin page reads and updates the table directly; pure helpers in `adminMessages.js` do filtering, counts, previews and reply links. The sidebar shows a new-message count that refreshes on a window event.

**Tech Stack:** React 18, Vite 5, Supabase JS v2, Postgres (Supabase RLS), lucide-react, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-10-15-admin-messages-design.md`

## Global Constraints

- Frontend commands run from `frontend/`; SQL lives in `backend/supabase/`.
- No Supabase secret/service key in the frontend.
- Limits (database and form must match): name 1–100 after trim; email ≤ 254 and `x@y.z` format; subject ≤ 150 (optional, stored `null` when empty); message 1–5000 after trim.
- Senders can only fill `name, email, subject, message, user_id`; `user_id` is `null` or the sender's own id; only admins read; only admins change, and only `handled_at`; nobody deletes from the site.
- The insert must not ask for the row back (no `.select()` after `.insert()`), because senders can't read messages.
- Window event name: `admin:messages-changed`.
- Exact copy strings are in the spec and the tasks; use them verbatim.
- New CSS classes: `admin-` prefix on admin pages, `contact__` prefix on the Contact page; use existing colour variables.
- Match surrounding code: no semicolons, single quotes, 2-space indent, short `//` comments only where the why isn't obvious.

## Review Focus

1. **Supabase not configured or offline on the Contact page** — sending must show the "Couldn't send your message…" text and keep what was typed, never crash. Pinned by Task 3's `try/catch` (including `supabase === null`) and manual check 2.
2. **Whitespace-only input** — a name or message of only spaces must be rejected with the right message. Pinned by Task 2 tests.
3. **Special characters in reply links** — `+` in an email address, `&`/`?`/non-ASCII in a subject must produce a working `mailto:` link. Pinned by Task 4 tests.
4. **Marking a message from the New tab** — it disappears from New, the counts and the sidebar badge update, and a failure leaves its status unchanged. Pinned by Task 4 count tests and manual check 5.
5. **Very long words or text without spaces in a message** — must wrap inside the card, not stretch the page. Pinned by Task 5 CSS (`overflow-wrap: anywhere`) and manual check 4.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/supabase/003_contact_messages.sql` (new) | table, constraints, grants, RLS policies |
| `backend/README.md` | step 3 in the SQL list |
| `frontend/src/contactMessage.js` (new) + test | form fields → row / error / spam |
| `frontend/src/pages/Contact.jsx` | saving, prefill, honeypot, states |
| `frontend/src/adminMessages.js` (new) + test | filter, counts, preview, reply link |
| `frontend/src/redirects.js` + test | `/admin/messages` allowed for admins |
| `frontend/src/pages/admin/AdminMessages.jsx` (new) | Messages page |
| `frontend/src/sections/AdminLayout.jsx` | Messages icon, new-count badge |
| `frontend/src/data.js` | `adminNavLinks` |
| `frontend/src/App.jsx` | `adminPages` |
| `frontend/src/styles.css` | contact honeypot/error, messages page, count badge |

---

### Task 1: SQL for contact messages

**Files:**
- Create: `backend/supabase/003_contact_messages.sql`
- Modify: `backend/README.md` (Supabase SQL list)

**Interfaces:**
- Consumes: `public.is_admin()` from `001_admin_users.sql`.
- Produces: table `public.contact_messages (id uuid, created_at timestamptz, name text, email text, subject text null, message text, user_id uuid null, handled_at timestamptz null)`; anon/authenticated may insert `name, email, subject, message, user_id`; admins may select all and update `handled_at`.

No database in the test setup: verify by reading.

- [ ] **Step 1: Create `backend/supabase/003_contact_messages.sql`**

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

- [ ] **Step 2: Add step 3 to `backend/README.md`**

In the "Supabase SQL" numbered list, after the `2. \`002_make_admin.sql\` …` item, add:

```markdown
3. `003_contact_messages.sql` — stores Contact form messages; only admins can read them
```

- [ ] **Step 3: Verify by reading**

Check against the spec's Database section: column names/types/constraints and limits match the Global Constraints; RLS enabled; `revoke all ... from anon, authenticated`; insert grant lists exactly five columns; update grant is only `handled_at`; no delete grant or policy; insert policy requires `handled_at is null` and `user_id` null or `auth.uid()`; select/update policies use `public.is_admin()`; every statement is re-runnable (`if not exists`, `drop policy if exists`).

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/003_contact_messages.sql backend/README.md
git commit -m "Add Supabase table and access rules for contact messages"
```

---

### Task 2: Contact form validation helper

**Files:**
- Create: `frontend/src/contactMessage.js`
- Test: `frontend/src/contactMessage.test.js`

**Interfaces:**
- Produces: `messageFromForm(fields, user)` where `fields = { name, email, subject, message, website }` (strings, any may be missing) and `user` is a Supabase user or `null`. Returns exactly one of `{ spam: true }`, `{ error: string }`, `{ row: { name, email, subject, message, user_id } }`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/contactMessage.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { messageFromForm } from './contactMessage.js'

const valid = { name: 'Leila', email: 'leila@mail.com', subject: 'Bikes', message: 'Hello!', website: '' }
const send = (over, user = null) => messageFromForm({ ...valid, ...over }, user)
const x = (n) => 'x'.repeat(n)

describe('messageFromForm', () => {
  it('builds a trimmed row for a visitor', () => {
    expect(send({ name: '  Leila  ', email: ' leila@mail.com ', subject: ' Bikes ', message: '  Hello!  ' })).toEqual({
      row: { name: 'Leila', email: 'leila@mail.com', subject: 'Bikes', message: 'Hello!', user_id: null },
    })
  })

  it('links the message to a signed-in user', () => {
    expect(send({}, { id: 'u-1', email: 'leila@mail.com' }).row.user_id).toBe('u-1')
  })

  it('stores an empty or missing subject as null', () => {
    expect(send({ subject: '   ' }).row.subject).toBe(null)
    expect(messageFromForm({ name: 'A', email: 'a@b.co', message: 'Hi' }, null).row.subject).toBe(null)
  })

  it('flags the hidden website field as spam before any other check', () => {
    expect(send({ website: 'http://spam.example', name: '' })).toEqual({ spam: true })
    expect(send({ website: '   ' }).row).toBeDefined()
  })

  it('requires a name', () => {
    expect(send({ name: '   ' })).toEqual({ error: 'Please enter your name.' })
    expect(messageFromForm({ email: 'a@b.co', message: 'Hi' }, null)).toEqual({ error: 'Please enter your name.' })
  })

  it('limits the name to 100 characters', () => {
    expect(send({ name: x(100) }).row).toBeDefined()
    expect(send({ name: x(101) })).toEqual({ error: 'Your name is too long (100 characters max).' })
  })

  it.each(['', 'leila', 'leila@', '@mail.com', 'leila@mail', 'le ila@mail.com', 'a@b@c.com'])('rejects the email "%s"', (email) => {
    expect(send({ email })).toEqual({ error: 'Please enter a valid email address.' })
  })

  it('accepts usual email addresses and limits them to 254 characters', () => {
    expect(send({ email: 'a.b+c@sub.mail.tn' }).row).toBeDefined()
    expect(send({ email: `${x(245)}@mail.com` }).row).toBeDefined()
    expect(send({ email: `${x(246)}@mail.com` })).toEqual({ error: 'Please enter a valid email address.' })
  })

  it('limits the subject to 150 characters', () => {
    expect(send({ subject: x(150) }).row).toBeDefined()
    expect(send({ subject: x(151) })).toEqual({ error: 'Your subject is too long (150 characters max).' })
  })

  it('requires a message', () => {
    expect(send({ message: ' \n ' })).toEqual({ error: 'Please write a message.' })
  })

  it('limits the message to 5000 characters', () => {
    expect(send({ message: x(5000) }).row).toBeDefined()
    expect(send({ message: x(5001) })).toEqual({ error: 'Your message is too long (5000 characters max).' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `contactMessage.test.js` cannot resolve `./contactMessage.js`.

- [ ] **Step 3: Implement `contactMessage.js`**

Create `frontend/src/contactMessage.js`:

```js
// Turns Contact form fields into a row for public.contact_messages,
// with the same limits as the database so people see a clear message.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function messageFromForm(fields, user) {
  // Hidden field only bots fill in
  if (fields.website?.trim()) return { spam: true }

  const name = (fields.name ?? '').trim()
  const email = (fields.email ?? '').trim()
  const subject = (fields.subject ?? '').trim()
  const message = (fields.message ?? '').trim()

  if (!name) return { error: 'Please enter your name.' }
  if (name.length > 100) return { error: 'Your name is too long (100 characters max).' }
  if (email.length > 254 || !EMAIL.test(email)) return { error: 'Please enter a valid email address.' }
  if (subject.length > 150) return { error: 'Your subject is too long (150 characters max).' }
  if (!message) return { error: 'Please write a message.' }
  if (message.length > 5000) return { error: 'Your message is too long (5000 characters max).' }

  return { row: { name, email, subject: subject || null, message, user_id: user?.id ?? null } }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all files, including `contactMessage.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/contactMessage.js src/contactMessage.test.js
git commit -m "Add Contact form validation matching the database limits"
```

---

### Task 3: Save messages from the Contact page

**Files:**
- Modify: `frontend/src/pages/Contact.jsx` (whole file)
- Modify: `frontend/src/styles.css` (after `.contact__sent`, ~line 788)

**Interfaces:**
- Consumes: `messageFromForm` (Task 2); `supabase` (client or `null`) from `src/supabase.js`; `brand.email` from `src/data.js`. `App` renders `<Contact user={user} />` (`user` is `null` on the public page, a Supabase user on `/app/contact`).

- [ ] **Step 1: Replace `Contact.jsx`**

Replace the whole file `frontend/src/pages/Contact.jsx` with:

```jsx
import { useEffect, useState } from 'react'
import { MapPin, Mail, Clock, Phone, Send } from 'lucide-react'
import { brand } from '../data.js'
import { supabase } from '../supabase.js'
import { messageFromForm } from '../contactMessage.js'

const details = [
  { icon: MapPin, label: 'Address', value: brand.address },
  { icon: Mail, label: 'Email', value: brand.email, href: `mailto:${brand.email}` },
  { icon: Phone, label: 'Phone', value: brand.phone, href: `tel:${brand.phone.replace(/\s/g, '')}` },
  { icon: Clock, label: 'Opening hours', value: brand.hours },
]

const sendFailed = `Couldn't send your message. Please try again, or email us at ${brand.email}.`

export default function Contact({ user }) {
  // null, 'sending', 'sent' or { error }
  const [status, setStatus] = useState(null)

  useEffect(() => {
    document.title = 'Contact - Aaslema'
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const form = e.target
    const result = messageFromForm(Object.fromEntries(new FormData(form)), user)
    if (result.error) return setStatus({ error: result.error })

    // Bots get the normal thank-you, but nothing is saved
    if (!result.spam) {
      setStatus('sending')
      try {
        if (!supabase) throw new Error('Supabase is not configured')
        const { error } = await supabase.from('contact_messages').insert(result.row)
        if (error) throw error
      } catch {
        return setStatus({ error: sendFailed })
      }
    }
    form.reset()
    setStatus('sent')
  }

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Get In Touch</h1>
          <p>Questions about a route, a city or the community? We usually reply within a day.</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact__grid">
          <ul className="contact__details">
            {details.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="contact__card">
                <span className="contact__icon"><Icon size={22} /></span>
                <div>
                  <h3>{label}</h3>
                  {href ? <a href={href}>{value}</a> : <p>{value}</p>}
                </div>
              </li>
            ))}
          </ul>

          <form className="contact__form" onSubmit={submit} noValidate>
            <h2>Send us a message</h2>
            <fieldset className="contact__fieldset" disabled={status === 'sending'}>
              <div className="contact__row">
                <label>Name<input type="text" name="name" autoComplete="name" defaultValue={user?.user_metadata?.full_name ?? ''} required /></label>
                <label>Email<input type="email" name="email" autoComplete="email" defaultValue={user?.email ?? ''} required /></label>
              </div>
              <label>Subject<input type="text" name="subject" /></label>
              <label>Message<textarea name="message" rows={6} required /></label>
              {/* Hidden from people; bots that fill every field get caught */}
              <label className="contact__hp" aria-hidden="true">Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
              <button type="submit" className="btn btn--primary">
                {status === 'sending' ? 'Sending…' : <>Send Message <Send size={16} /></>}
              </button>
            </fieldset>
            {status === 'sent' && <p className="contact__sent" role="status">Thanks! We got your message and usually reply within a day.</p>}
            {status?.error && <p className="contact__error" role="alert">{status.error}</p>}
          </form>
        </div>
      </section>
    </>
  )
}
```

`noValidate` lets `messageFromForm` show its own messages instead of the browser's. `form.reset()` puts inputs back to their `defaultValue`, so a signed-in user's name and email come back.

- [ ] **Step 2: Add the styles**

In `frontend/src/styles.css`, directly after the `.contact__sent { ... }` line, add:

```css
.contact__fieldset { display: contents; }
.contact__fieldset:disabled input, .contact__fieldset:disabled textarea, .contact__fieldset:disabled .btn { opacity: 0.7; }
.contact__error { margin: 0; color: #c0392b; font-weight: 500; }
.contact__hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
```

(`display: contents` keeps the fields in the form's existing grid; a disabled fieldset still disables every input inside it.)

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; build prints `✓ built in`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Contact.jsx src/styles.css
git commit -m "Save Contact form messages in Supabase"
```

---

### Task 4: Messages helpers and the /admin/messages route

**Files:**
- Create: `frontend/src/adminMessages.js`
- Test: `frontend/src/adminMessages.test.js`
- Modify: `frontend/src/redirects.js:7`
- Test: `frontend/src/redirects.test.js` (append)

**Interfaces:**
- Consumes: message rows `{ id, created_at, name, email, subject, message, user_id, handled_at }` (`subject`, `user_id`, `handled_at` may be `null`).
- Produces:
  - `isHandled(m): boolean`
  - `filterByStatus(messages, status)` with `status` in `'new' | 'handled' | 'all'`
  - `messageCounts(messages): { new, handled, all }`
  - `messagePreview(m, max = 80): string`
  - `replyHref(m): string`
  - `adminPagePaths` now `['/admin', '/admin/messages']`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/adminMessages.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { filterByStatus, isHandled, messageCounts, messagePreview, replyHref } from './adminMessages.js'

const msg = (over) => ({
  id: 'id', created_at: '2026-10-15T10:00:00Z', name: 'Leila', email: 'leila@mail.com',
  subject: null, message: 'Hello', user_id: null, handled_at: null, ...over,
})

const list = [msg({ id: '1' }), msg({ id: '2', handled_at: '2026-10-15T11:00:00Z' }), msg({ id: '3' })]
const ids = (ms) => ms.map((m) => m.id)

describe('isHandled', () => {
  it('is true only when handled_at is set', () => {
    expect(isHandled(msg({}))).toBe(false)
    expect(isHandled(msg({ handled_at: '2026-10-15T11:00:00Z' }))).toBe(true)
  })
})

describe('filterByStatus', () => {
  it('splits new and handled, keeping order', () => {
    expect(ids(filterByStatus(list, 'new'))).toEqual(['1', '3'])
    expect(ids(filterByStatus(list, 'handled'))).toEqual(['2'])
    expect(ids(filterByStatus(list, 'all'))).toEqual(['1', '2', '3'])
  })
})

describe('messageCounts', () => {
  it('counts each tab', () => {
    expect(messageCounts(list)).toEqual({ new: 2, handled: 1, all: 3 })
    expect(messageCounts([])).toEqual({ new: 0, handled: 0, all: 0 })
  })
})

describe('messagePreview', () => {
  it('uses the subject when there is one', () => {
    expect(messagePreview(msg({ subject: 'Bikes on the TGM', message: 'Long text' }))).toBe('Bikes on the TGM')
  })

  it('falls back to the message with whitespace collapsed', () => {
    expect(messagePreview(msg({ message: '  Hello\n\nthere   friend ' }))).toBe('Hello there friend')
  })

  it('cuts long text and adds an ellipsis', () => {
    expect(messagePreview(msg({ message: 'x'.repeat(80) }))).toBe('x'.repeat(80))
    expect(messagePreview(msg({ message: 'x'.repeat(81) }))).toBe(`${'x'.repeat(80)}…`)
    expect(messagePreview(msg({ message: 'abcdef' }), 3)).toBe('abc…')
  })
})

describe('replyHref', () => {
  it('replies to the sender with "Re:" and the subject', () => {
    expect(replyHref(msg({ subject: 'Bikes & trains?' }))).toBe('mailto:leila@mail.com?subject=Re%3A%20Bikes%20%26%20trains%3F')
  })

  it('encodes non-ASCII subjects and special characters in the address', () => {
    expect(replyHref(msg({ email: 'a+b@mail.com', subject: 'Été à Tozeur' })))
      .toBe('mailto:a%2Bb@mail.com?subject=Re%3A%20%C3%89t%C3%A9%20%C3%A0%20Tozeur')
  })

  it('uses a default subject when there is none', () => {
    expect(replyHref(msg({}))).toBe('mailto:leila@mail.com?subject=Re%3A%20Your%20message%20to%20Aaslema')
  })
})
```

In `frontend/src/redirects.test.js`, append at the end of the file:

```js
describe('redirectFor and /admin/messages', () => {
  it('is an admin page', () => {
    expect(adminPagePaths).toContain('/admin/messages')
  })

  it('lets admins stay, sends non-admins to /app and visitors to /signin', () => {
    expect(redirectFor('/admin/messages', true, true)).toBe(null)
    expect(redirectFor('/admin/messages', true, false)).toBe('/app')
    expect(redirectFor('/admin/messages', false)).toBe('/signin')
  })

  it('sends admins on unknown paths under it to /admin', () => {
    expect(redirectFor('/admin/messages/1', true, true)).toBe('/admin')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `adminMessages.test.js` cannot resolve `./adminMessages.js`; the `/admin/messages` redirect tests fail (admins get `/admin`, and `adminPagePaths` lacks it).

- [ ] **Step 3: Implement `adminMessages.js`**

Create `frontend/src/adminMessages.js`:

```js
// Filtering, counts, previews and reply links for the admin Messages page.

export const isHandled = (m) => Boolean(m.handled_at)

export function filterByStatus(messages, status) {
  if (status === 'new') return messages.filter((m) => !isHandled(m))
  if (status === 'handled') return messages.filter(isHandled)
  return messages
}

export function messageCounts(messages) {
  const handled = messages.filter(isHandled).length
  return { new: messages.length - handled, handled, all: messages.length }
}

export function messagePreview(m, max = 80) {
  const text = (m.subject || m.message || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// Keeps the @ readable for mail apps; everything else is encoded
export function replyHref(m) {
  const to = m.email.split('@').map(encodeURIComponent).join('@')
  const subject = m.subject ? `Re: ${m.subject}` : 'Re: Your message to Aaslema'
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`
}
```

- [ ] **Step 4: Allow the route**

In `frontend/src/redirects.js`, change line 7 to:

```js
export const adminPagePaths = ['/admin', '/admin/messages']
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all files.

- [ ] **Step 6: Commit**

```bash
git add src/adminMessages.js src/adminMessages.test.js src/redirects.js src/redirects.test.js
git commit -m "Add admin message helpers and the /admin/messages route"
```

---

### Task 5: Messages page and sidebar badge

**Files:**
- Create: `frontend/src/pages/admin/AdminMessages.jsx`
- Modify: `frontend/src/sections/AdminLayout.jsx`
- Modify: `frontend/src/data.js:35-37` (`adminNavLinks`)
- Modify: `frontend/src/App.jsx:24,36`
- Modify: `frontend/src/styles.css` (Admin block and its mobile rules)

**Interfaces:**
- Consumes: `filterByStatus`, `isHandled`, `messageCounts`, `messagePreview`, `replyHref` (Task 4); `lastSeen(iso)` from `src/adminUsers.js`; `supabase` from `src/supabase.js`; table from Task 1.
- Produces: `<AdminMessages />` (default export); `AdminLayout` badge listening to `admin:messages-changed`.

- [ ] **Step 1: Add the nav link**

In `frontend/src/data.js`, change `adminNavLinks` to:

```js
export const adminNavLinks = [
  ['Users', '/admin'],
  ['Messages', '/admin/messages'],
]
```

- [ ] **Step 2: Create `AdminMessages.jsx`**

Create `frontend/src/pages/admin/AdminMessages.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { supabase } from '../../supabase.js'
import { lastSeen } from '../../adminUsers.js'
import { filterByStatus, isHandled, messageCounts, messagePreview, replyHref } from '../../adminMessages.js'

const tabs = [['new', 'New'], ['handled', 'Handled'], ['all', 'All']]

// Tells the sidebar to refresh its new-message count
const notifyChanged = () => window.dispatchEvent(new Event('admin:messages-changed'))

export default function AdminMessages() {
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('new')
  const [openId, setOpenId] = useState(null)

  const load = async () => {
    setError(null)
    setMessages(null)
    try {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
      if (error) setError(error)
      else setMessages(data ?? [])
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Messages - Aaslema Admin'
    load()
  }, [])

  const replace = (updated) => setMessages((list) => list.map((m) => (m.id === updated.id ? updated : m)))

  if (error) {
    return (
      <>
        <h1>Messages</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load messages: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (messages === null) {
    return <><h1>Messages</h1><p className="admin-note">Loading messages…</p></>
  }

  const counts = messageCounts(messages)
  const shown = filterByStatus(messages, tab)

  return (
    <>
      <h1>Messages</h1>
      <div className="admin-tabs" role="tablist" aria-label="Filter messages">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="admin-note">{tab === 'new' ? 'No new messages.' : 'No messages here.'}</p>
      ) : (
        <ul className="admin-msgs">
          {shown.map((m) => (
            <MessageItem
              key={m.id}
              message={m}
              open={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              onChange={replace}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function MessageItem({ message, open, onToggle, onChange }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const handled = isHandled(message)

  const toggleStatus = async () => {
    setBusy(true)
    setFailed(false)
    const handled_at = handled ? null : new Date().toISOString()
    try {
      const { error } = await supabase.from('contact_messages').update({ handled_at }).eq('id', message.id)
      if (error) throw error
      onChange({ ...message, handled_at })
      notifyChanged()
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  return (
    <li className={`admin-msg ${open ? 'admin-msg--open' : ''}`}>
      <button type="button" className="admin-msg__head" onClick={onToggle} aria-expanded={open}>
        <span className="admin-msg__from"><strong>{message.name}</strong> {message.email}</span>
        <span className="admin-msg__preview">{messagePreview(message)}</span>
        <span className="admin-msg__meta">
          {message.user_id && <span className="admin-badge admin-badge--ok">Signed-in user</span>}
          {lastSeen(message.created_at)}
        </span>
      </button>

      {open && (
        <div className="admin-msg__body">
          {message.subject && <h3>{message.subject}</h3>}
          <p className="admin-msg__text">{message.message}</p>
          <p className="admin-msg__date">Received {new Date(message.created_at).toLocaleString()}</p>
          <div className="admin-msg__actions">
            <a href={replyHref(message)} className="btn btn--primary btn--sm"><Mail size={14} /> Reply</a>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={toggleStatus}>
              {handled ? 'Mark as new' : 'Mark handled'}
            </button>
          </div>
          {failed && <p className="admin-note--error admin-msg__error">Couldn't update this message. Try again.</p>}
        </div>
      )}
    </li>
  )
}
```

- [ ] **Step 3: Add the icon and count badge to `AdminLayout.jsx`**

In `frontend/src/sections/AdminLayout.jsx`:

Replace the first two import lines with:

```jsx
import { useEffect, useState } from 'react'
import { Compass, ExternalLink, LogOut, Mail, Menu, Users, X } from 'lucide-react'
```

Add after the `import { currentPath } ...` line:

```jsx
import { supabase } from '../supabase.js'
```

Replace `const icons = { '/admin': Users }` with:

```jsx
const icons = { '/admin': Users, '/admin/messages': Mail }

// Number of unhandled messages; reloads when the Messages page changes one
function useNewMessageCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const { count, error } = await supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .is('handled_at', null)
        if (!error) setCount(count ?? 0)
      } catch {
        // No badge if the count can't be loaded
      }
    }
    load()
    window.addEventListener('admin:messages-changed', load)
    return () => window.removeEventListener('admin:messages-changed', load)
  }, [])

  return count
}
```

Inside `AdminLayout`, after `const name = ...`, add:

```jsx
  const newMessages = useNewMessageCount()
```

and in the nav link, replace:

```jsx
                {Icon && <Icon size={18} />} {label}
```

with:

```jsx
                {Icon && <Icon size={18} />} {label}
                {href === '/admin/messages' && newMessages > 0 && <span className="admin-nav__count">{newMessages}</span>}
```

- [ ] **Step 4: Register the page in `App.jsx`**

In `frontend/src/App.jsx`, after `import AdminUsers from './pages/admin/AdminUsers.jsx'` add:

```jsx
import AdminMessages from './pages/admin/AdminMessages.jsx'
```

and change the `adminPages` line to:

```jsx
const adminPages = { '/admin': AdminUsers, '/admin/messages': AdminMessages }
```

- [ ] **Step 5: Add the styles**

In `frontend/src/styles.css`, at the end of the Admin block (directly after the `.admin-note--error { ... }` line), add:

```css
.admin-nav__count {
  margin-left: auto; min-width: 22px; padding: 0 7px; border-radius: 999px;
  background: var(--secondary); color: var(--white); font-size: 12px; font-weight: 600; line-height: 20px; text-align: center;
}
.admin-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.admin-tab {
  padding: 8px 16px; border: 1px solid var(--border); border-radius: 999px;
  background: var(--surface); color: var(--title); font: inherit; font-size: 15px; cursor: pointer;
}
.admin-tab--active { background: var(--primary); border-color: var(--primary); color: var(--white); }
.admin-msgs { display: flex; flex-direction: column; gap: 10px; }
.admin-msg { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.admin-msg--open { border-color: var(--primary); }
.admin-msg__head {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 16px; width: 100%; padding: 14px 18px;
  border: 0; background: none; color: var(--text); font: inherit; text-align: left; cursor: pointer;
}
.admin-msg__from, .admin-msg__preview { grid-column: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-msg__from strong { color: var(--title); }
.admin-msg__preview { font-size: 14px; }
.admin-msg__meta { grid-column: 2; grid-row: 1; display: flex; align-items: center; gap: 8px; font-size: 14px; white-space: nowrap; }
.admin-msg__body { padding: 0 18px 18px; border-top: 1px solid var(--border); }
.admin-msg__body h3 { margin: 16px 0 0; color: var(--title); font-size: 18px; }
.admin-msg__text { margin: 12px 0 0; color: var(--title); white-space: pre-wrap; overflow-wrap: anywhere; }
.admin-msg__date { margin: 12px 0 0; color: var(--text); font-size: 13px; }
.admin-msg__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.admin-msg__error { margin: 12px 0 0; }
.admin-btn-outline { background: none; border: 1px solid var(--border); color: var(--title); }
.admin-btn-outline:disabled { opacity: 0.6; cursor: default; }
```

Inside the existing `@media (max-width: 991px)` block, after the existing `.admin-stats { grid-template-columns: 1fr; }` line, add:

```css
  .admin-msg__head { grid-template-columns: minmax(0, 1fr); }
  .admin-msg__meta { grid-column: 1; grid-row: auto; }
```

- [ ] **Step 6: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; `✓ built in`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminMessages.jsx src/sections/AdminLayout.jsx src/data.js src/App.jsx src/styles.css
git commit -m "Add admin Messages page and new-message count in the sidebar"
```

- [ ] **Step 8: Manual check (site owner, in the browser)**

After running `backend/supabase/003_contact_messages.sql` in the Supabase SQL Editor and rebuilding (`docker compose up -d --build`):

1. Run `003_contact_messages.sql`; it reports success.
2. Signed out, send a message from `/contact` → "Thanks! We got your message…"; the form clears. Leave the message empty and send → "Please write a message."
3. Signed in as a normal user, `/app/contact` shows your name and email; send one.
4. As admin, the sidebar shows "Messages 2"; the page lists both (the second tagged "Signed-in user"). A message with a very long word wraps inside its card.
5. Open one and Mark handled → it leaves New, the tab counts and the sidebar badge drop by one; in Handled, Mark as new moves it back.
6. Reply opens your email app to the sender with "Re: …".
7. In the browser dev tools, fill the hidden `website` field and send → success text, but no new message appears in the admin.
8. In the SQL Editor: `set role anon; select * from public.contact_messages;` → "permission denied"; then `reset role;`.
