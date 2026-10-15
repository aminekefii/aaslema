# Destination Moments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users upload photo moments from a destination page; admins approve or delete them on `/admin/moments`; approved moments show to everyone in a carousel (photo, name, caption, highlight, "5h ago") in the destination's Moments tab.

**Architecture:** A private Supabase Storage bucket `moments` holds shrunk JPEGs; a `public.moments` table holds the details, with row level security and column grants; storage rules let anyone read a photo only once its moment is approved (via `security definer` helpers). The frontend keeps rules in pure, tested modules (`timeAgo.js`, `moments.js`), Supabase calls in `momentsApi.js` (never throws), and a new `MomentsCarousel` component.

**Tech Stack:** React 18, Vite 5, Supabase JS v2 (Postgres RLS + Storage), lucide-react, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-10-15-city-moments-design.md`

## Global Constraints

- Frontend commands run from `frontend/`; SQL lives in `backend/supabase/`.
- Bucket `moments`: private, `image/jpeg` only, 2 MB (2097152 bytes) max. Paths `<user id>/<uuid>.jpg`.
- Photos shrunk in the browser to ≤ 1600 px longest side, JPEG quality 0.85 (retry 0.7). Picked files: `image/*`, ≤ 15 MB.
- Caption required, 3–300 characters after trimming, counted in code points; author name ≤ 100.
- Admin actions: Approve and Delete only (no unpublish). Users cannot edit or delete moments.
- Carousel: arrows + swipe (40 px), 3 / 2 / 1 cards, no autoplay. Card date is `timeAgo(created_at)`.
- No browser dialogs (`alert`/`confirm`); Delete confirms in the page.
- Commit messages: short, plain-English, capitalised, no prefix.

## Review Focus

- An iPhone HEIC photo picked in Chrome or Android cannot be decoded by `createImageBitmap`; the user must get "Couldn't read this photo. Try another one.", not a frozen "Uploading…" → handled in `uploadMoment` (Task 5); checked by hand in Task 6 Step 6.
- If the photo uploads but saving the moment fails, the photo must not be left behind → `uploadMoment` removes it (Task 5); the storage delete rule allows it only while no moment uses it (Task 1).
- A long caption or an unbroken word (a URL) must not stretch a carousel card or push the arrows away → 3-line clamp + `overflow-wrap: anywhere` + `min-width: 0` (Task 6 CSS); checked by hand in Task 6 Step 6.
- A visitor must never see a pending photo, even with its path → storage select rule (Task 1); checked in the owner's manual step 7.
- With fewer moments than fit (1 or 2 on desktop) there must be no arrows and no dead swipe → `positions === 1` hides arrows (Task 6); pinned by the carousel's `positions` maths reused from the reviews slider.

---

### Task 1: Moments table, photo bucket and access rules

**Files:**
- Create: `backend/supabase/007_moments.sql`
- Modify: `backend/README.md` (Supabase SQL list)

**Interfaces:**
- Produces: table `public.moments (id, user_id, city_id, spot, caption, author_name, image_path, created_at, approved_at)`; RPC `published_moments(p_city_id text)` → `{ id, author_name, spot, caption, image_path, created_at }`; bucket `moments`.

- [ ] **Step 1: Write the SQL file**

Copy the SQL block from the spec's "Database and storage" section into `backend/supabase/007_moments.sql`, exactly as written there (from `-- Destination moments: photos users upload…` to the last `);` of the delete policy).

- [ ] **Step 2: Add the file to the README list**

In `backend/README.md`, after the line starting `6. \`006_reviews.sql\``, add:

```markdown
7. `007_moments.sql` — destination moments: the private `moments` photo bucket and the moments table; admins approve moments before they show
```

- [ ] **Step 3: Check by reading**

Compare the file with the spec block (must be identical). There is no local Postgres; the owner runs it.

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/007_moments.sql backend/README.md
git commit -m "Add Supabase table, photo bucket and access rules for moments"
```

---

### Task 2: Shared `usePerView` hook

**Files:**
- Create: `frontend/src/usePerView.js`
- Modify: `frontend/src/sections/Testimonials.jsx` (remove the local hook, import the shared one)

**Interfaces:**
- Produces: `export default function usePerView() → 1 | 2 | 3`.

This is a move with no behaviour change; the existing suite and the build are its check.

- [ ] **Step 1: Create the hook**

`frontend/src/usePerView.js`:

```js
import { useEffect, useState } from 'react'

// Cards per view for the sliders, matching travosy-react's tiny-three-item slider (3 / 2 / 1).
export default function usePerView() {
  const get = () => (window.innerWidth >= 992 ? 3 : window.innerWidth >= 767 ? 2 : 1)
  const [perView, setPerView] = useState(get)
  useEffect(() => {
    const onResize = () => setPerView(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return perView
}
```

- [ ] **Step 2: Use it in the reviews slider**

In `frontend/src/sections/Testimonials.jsx`, delete the whole local hook (the comment `// Cards per view, matching travosy-react's tiny-three-item slider (3 / 2 / 1).` and `function usePerView() { … }` up to its closing `}`), and add after `import Modal from '../components/Modal.jsx'`:

```js
import usePerView from '../usePerView.js'
```

- [ ] **Step 3: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS (159); build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/usePerView.js frontend/src/sections/Testimonials.jsx
git commit -m "Move the slider cards-per-view hook into usePerView.js"
```

---

### Task 3: `timeAgo` formatter

**Files:**
- Create: `frontend/src/timeAgo.js`
- Test: `frontend/src/timeAgo.test.js`

**Interfaces:**
- Produces: `timeAgo(iso: string, now?: Date) → string`.

- [ ] **Step 1: Write the failing test**

`frontend/src/timeAgo.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { timeAgo } from './timeAgo.js'

const now = new Date('2026-10-15T12:00:00Z')
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const ago = (ms) => new Date(now.getTime() - ms).toISOString()

describe('timeAgo', () => {
  it('says "Just now" under a minute and for future dates', () => {
    expect(timeAgo(ago(59 * 1000), now)).toBe('Just now')
    expect(timeAgo(ago(-5 * MIN), now)).toBe('Just now')
  })

  it('counts minutes under an hour', () => {
    expect(timeAgo(ago(MIN), now)).toBe('1 min ago')
    expect(timeAgo(ago(59 * MIN), now)).toBe('59 min ago')
  })

  it('counts hours under a day', () => {
    expect(timeAgo(ago(60 * MIN), now)).toBe('1h ago')
    expect(timeAgo(ago(5 * HOUR), now)).toBe('5h ago')
    expect(timeAgo(ago(24 * HOUR - MIN), now)).toBe('23h ago')
  })

  it('says "a day ago" from 24 to 48 hours', () => {
    expect(timeAgo(ago(24 * HOUR), now)).toBe('a day ago')
    expect(timeAgo(ago(47 * HOUR), now)).toBe('a day ago')
  })

  it('counts days under a week', () => {
    expect(timeAgo(ago(48 * HOUR), now)).toBe('2 days ago')
    expect(timeAgo(ago(6 * DAY), now)).toBe('6 days ago')
  })

  it('says "a week ago" from 7 to 13 days', () => {
    expect(timeAgo(ago(7 * DAY), now)).toBe('a week ago')
    expect(timeAgo(ago(13 * DAY), now)).toBe('a week ago')
  })

  it('counts weeks under 30 days', () => {
    expect(timeAgo(ago(14 * DAY), now)).toBe('2 weeks ago')
    expect(timeAgo(ago(29 * DAY), now)).toBe('4 weeks ago')
  })

  it('shows the date from 30 days on', () => {
    const iso = ago(30 * DAY)
    expect(timeAgo(iso, now)).toBe(new Date(iso).toLocaleDateString())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/timeAgo.test.js`
Expected: FAIL — cannot resolve `./timeAgo.js`.

- [ ] **Step 3: Write the implementation**

`frontend/src/timeAgo.js`:

```js
// "5h ago", "a day ago"… for moment cards; dates in the future (clock skew) count as now.
export function timeAgo(iso, now = new Date()) {
  const m = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  if (h < 48) return 'a day ago'
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} days ago`
  if (d < 14) return 'a week ago'
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  return new Date(iso).toLocaleDateString()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/timeAgo.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/timeAgo.js frontend/src/timeAgo.test.js
git commit -m "Add timeAgo formatter for moment cards"
```

---

### Task 4: Moment form rules

**Files:**
- Create: `frontend/src/moments.js`
- Test: `frontend/src/moments.test.js`

**Interfaces:**
- Consumes: `displayName(user)` from `names.js`; `textLength(s)` from `reviews.js`.
- Produces:
  - `CAPTION_MAX = 300`, `PHOTO_MAX_BYTES = 15 * 1024 * 1024`
  - `momentFromForm({ file, caption, spot }, user, city) → { error } | { row: { city_id, spot, caption, author_name } }` (`city` has `id` and `highlights`)
  - `momentPath(userId, id) → string`
  - `spotMoments(moments, spot) → moments`

- [ ] **Step 1: Write the failing test**

`frontend/src/moments.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { PHOTO_MAX_BYTES, momentFromForm, momentPath, spotMoments } from './moments.js'

const user = { email: 'leila@x.com', user_metadata: { full_name: 'Leila Ben Ali' } }
const city = { id: 'tozeur', highlights: ['Chott el Djerid', 'Dar Cherait'] }
const photo = { type: 'image/jpeg', size: 3 * 1024 * 1024 }
const valid = { file: photo, caption: 'Sunrise over the salt lake', spot: 'Chott el Djerid' }

describe('momentFromForm', () => {
  it('returns the row to save', () => {
    expect(momentFromForm(valid, user, city)).toEqual({
      row: { city_id: 'tozeur', spot: 'Chott el Djerid', caption: 'Sunrise over the salt lake', author_name: 'Leila Ben Ali' },
    })
  })

  it('needs a photo first', () => {
    expect(momentFromForm({ ...valid, file: null, caption: '' }, user, city)).toEqual({ error: 'Please choose a photo.' })
  })

  it('needs an image file', () => {
    expect(momentFromForm({ ...valid, file: { type: 'application/pdf', size: 10 } }, user, city)).toEqual({ error: 'Please choose an image file.' })
    expect(momentFromForm({ ...valid, file: { type: '', size: 10 } }, user, city)).toEqual({ error: 'Please choose an image file.' })
  })

  it('allows photos up to 15 MB', () => {
    expect(momentFromForm({ ...valid, file: { type: 'image/png', size: PHOTO_MAX_BYTES } }, user, city).row).toBeDefined()
    expect(momentFromForm({ ...valid, file: { type: 'image/png', size: PHOTO_MAX_BYTES + 1 } }, user, city)).toEqual({ error: 'This photo is too large (15 MB max).' })
  })

  it('needs a caption of at least 3 characters after trimming', () => {
    const error = { error: 'Please write a caption (at least 3 characters).' }
    expect(momentFromForm({ ...valid, caption: '  ab  ' }, user, city)).toEqual(error)
    expect(momentFromForm({ ...valid, caption: undefined }, user, city)).toEqual(error)
    expect(momentFromForm({ ...valid, caption: ' abc ' }, user, city).row.caption).toBe('abc')
  })

  it('allows captions up to 300 characters', () => {
    expect(momentFromForm({ ...valid, caption: 'a'.repeat(300) }, user, city).row.caption).toHaveLength(300)
    expect(momentFromForm({ ...valid, caption: 'a'.repeat(301) }, user, city)).toEqual({ error: 'Your caption is too long (300 characters max).' })
  })

  it('counts an emoji as one character, like the database', () => {
    expect(momentFromForm({ ...valid, caption: '😀😀' }, user, city)).toEqual({ error: 'Please write a caption (at least 3 characters).' })
    expect(momentFromForm({ ...valid, caption: '😀'.repeat(300) }, user, city).row).toBeDefined()
  })

  it('keeps only a highlight of this destination', () => {
    expect(momentFromForm({ ...valid, spot: '' }, user, city).row.spot).toBe(null)
    expect(momentFromForm({ ...valid, spot: 'Bardo Museum' }, user, city).row.spot).toBe(null)
    expect(momentFromForm({ ...valid, spot: 'Dar Cherait' }, user, city).row.spot).toBe('Dar Cherait')
  })

  it('uses the email before @ without a full name, cut at 100 characters', () => {
    expect(momentFromForm(valid, { email: 'tom.r@x.com', user_metadata: {} }, city).row.author_name).toBe('tom.r')
    const long = { email: 'x@x.com', user_metadata: { full_name: 'é'.repeat(120) } }
    expect(Array.from(momentFromForm(valid, long, city).row.author_name)).toHaveLength(100)
  })
})

describe('momentPath', () => {
  it('puts the photo in the user folder', () => {
    expect(momentPath('u-1', 'p-2')).toBe('u-1/p-2.jpg')
  })
})

describe('spotMoments', () => {
  it('keeps the moments of one highlight', () => {
    const moments = [{ id: 1, spot: 'A' }, { id: 2, spot: null }, { id: 3, spot: 'A' }]
    expect(spotMoments(moments, 'A').map((m) => m.id)).toEqual([1, 3])
    expect(spotMoments(moments, 'B')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/moments.test.js`
Expected: FAIL — cannot resolve `./moments.js`.

- [ ] **Step 3: Write the implementation**

`frontend/src/moments.js`:

```js
import { displayName } from './names.js'
import { textLength } from './reviews.js'

// Destination moments: upload form rules (matching the database limits) and helpers.

export const CAPTION_MAX = 300
const CAPTION_MIN = 3
const NAME_MAX = 100
// Before shrinking; the uploaded JPEG is much smaller (bucket limit 2 MB)
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024

export function momentFromForm({ file, caption, spot }, user, city) {
  if (!file) return { error: 'Please choose a photo.' }
  if (!file.type?.startsWith('image/')) return { error: 'Please choose an image file.' }
  if (file.size > PHOTO_MAX_BYTES) return { error: 'This photo is too large (15 MB max).' }
  const text = (caption ?? '').trim()
  if (textLength(text) < CAPTION_MIN) return { error: 'Please write a caption (at least 3 characters).' }
  if (textLength(text) > CAPTION_MAX) return { error: 'Your caption is too long (300 characters max).' }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { city_id: city.id, spot: city.highlights.includes(spot) ? spot : null, caption: text, author_name: name } }
}

export const momentPath = (userId, id) => `${userId}/${id}.jpg`

export const spotMoments = (moments, spot) => moments.filter((m) => m.spot === spot)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/moments.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/moments.js frontend/src/moments.test.js
git commit -m "Add moment form rules"
```

---

### Task 5: Photo shrinking and the moments API

**Files:**
- Create: `frontend/src/imageResize.js`, `frontend/src/momentsApi.js`

**Interfaces:**
- Consumes: `momentPath` (Task 4); bucket and RPC (Task 1).
- Produces:
  - `resizeToJpeg(file, maxSide = 1600, quality = 0.85) → Promise<Blob>`
  - `photoUrls(paths: string[]) → Promise<{ [path]: url }>` (never throws)
  - `fetchPublishedMoments(cityId) → Promise<(row & { url })[] | null>` (never throws)
  - `uploadMoment(file, row, userId) → Promise<{ ok: true } | { error: string }>` (never throws)

Both files need a browser and Supabase, so they have no unit tests; the build is the check here, and Task 6's hand check exercises them.

- [ ] **Step 1: Write the photo shrinker**

`frontend/src/imageResize.js`:

```js
// Shrinks a photo to a JPEG before upload, so phone photos stay well under the 2 MB bucket limit.
export async function resizeToJpeg(file, maxSide = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file)
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
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not encode the photo')
  return blob
}
```

- [ ] **Step 2: Write the API module**

`frontend/src/momentsApi.js`:

```js
import { supabase } from './supabase.js'
import { resizeToJpeg } from './imageResize.js'
import { momentPath } from './moments.js'

// Destination moments in Supabase. None of these throw: pages get a plain value back.

const BUCKET = 'moments'
const MAX_BYTES = 2 * 1024 * 1024
const uploadFailed = "Couldn't upload your moment. Please try again."

// Photos are private; storage rules decide which links can be made (approved, own, or admin)
export async function photoUrls(paths) {
  if (!supabase || paths.length === 0) return {}
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
    if (error) return {}
    const urls = {}
    for (const item of data ?? []) if (item.signedUrl && !item.error) urls[item.path] = item.signedUrl
    return urls
  } catch {
    return {}
  }
}

// Approved moments of a destination with photo links; null if loading failed
export async function fetchPublishedMoments(cityId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('published_moments', { p_city_id: cityId })
    if (error) return null
    const rows = data ?? []
    const urls = await photoUrls(rows.map((r) => r.image_path))
    return rows.filter((r) => urls[r.image_path]).map((r) => ({ ...r, url: urls[r.image_path] }))
  } catch {
    return null
  }
}

export async function uploadMoment(file, row, userId) {
  if (!supabase) return { error: uploadFailed }
  let blob
  try {
    blob = await resizeToJpeg(file)
    if (blob.size > MAX_BYTES) blob = await resizeToJpeg(file, 1600, 0.7)
  } catch {
    // e.g. HEIC photos in browsers that can't decode them
    return { error: "Couldn't read this photo. Try another one." }
  }
  if (blob.size > MAX_BYTES) return { error: 'This photo is too large. Try a smaller one.' }

  const path = momentPath(userId, crypto.randomUUID())
  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) return { error: uploadFailed }
    const { error } = await supabase.from('moments').insert({ ...row, image_path: path })
    if (error) {
      // No moment points at the photo, so remove it (uploaders may delete unused photos)
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
      return { error: uploadFailed }
    }
    return { ok: true }
  } catch {
    return { error: uploadFailed }
  }
}
```

- [ ] **Step 3: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/imageResize.js frontend/src/momentsApi.js
git commit -m "Add photo shrinking and the moments Supabase calls"
```

---

### Task 6: Upload, under-review popup and carousel on the destination page

**Files:**
- Create: `frontend/src/components/MomentsCarousel.jsx`
- Modify: `frontend/src/pages/CityDetail.jsx`, `frontend/src/styles.css`

**Interfaces:**
- Consumes: `usePerView` (Task 2), `timeAgo` (Task 3), `CAPTION_MAX`, `momentFromForm`, `spotMoments` (Task 4), `fetchPublishedMoments`, `uploadMoment` (Task 5), `textLength` (`reviews.js`).
- Produces: default export `MomentsCarousel({ moments })`.

- [ ] **Step 1: Write the carousel**

`frontend/src/components/MomentsCarousel.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Navigation } from 'lucide-react'
import usePerView from '../usePerView.js'
import { timeAgo } from '../timeAgo.js'

// Approved moments of a destination: arrows and swipe, 3 / 2 / 1 cards, no autoplay.
export default function MomentsCarousel({ moments }) {
  const perView = usePerView()
  const positions = Math.max(1, moments.length - perView + 1)
  const [index, setIndex] = useState(0)
  const dragStart = useRef(null)

  useEffect(() => setIndex((i) => Math.min(i, positions - 1)), [positions])

  const go = (i) => setIndex(Math.max(0, Math.min(positions - 1, i)))
  const onPointerDown = (e) => { dragStart.current = e.clientX }
  const onPointerUp = (e) => {
    if (dragStart.current !== null) {
      const dx = e.clientX - dragStart.current
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
    }
    dragStart.current = null
  }

  return (
    <div className="moments-carousel">
      {positions > 1 && (
        <button type="button" className="moments-carousel__arrow moments-carousel__arrow--prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous moments">
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="moments-carousel__viewport" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <div className="moments-carousel__track" style={{ transform: `translateX(-${(index * 100) / perView}%)` }}>
          {moments.map((m) => (
            <figure key={m.id} className="moment-card" style={{ flexBasis: `${100 / perView}%` }}>
              <div className="moment-card__inner">
                <img src={m.url} alt={m.caption} draggable="false" />
                <figcaption>
                  <strong>{m.author_name}</strong>
                  <p className="moment-card__caption">{m.caption}</p>
                  {m.spot && <p className="moment-card__spot"><Navigation size={12} /> {m.spot}</p>}
                  <time dateTime={m.created_at}>{timeAgo(m.created_at)}</time>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
      {positions > 1 && (
        <button type="button" className="moments-carousel__arrow moments-carousel__arrow--next" onClick={() => go(index + 1)} disabled={index === positions - 1} aria-label="Next moments">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Switch the destination page to Supabase moments**

In `frontend/src/pages/CityDetail.jsx`:

a) Imports: after `import { fetchLikeCounts, fetchMyCityIds, setCityFlag } from '../cityActivity.js'` add:

```js
import MomentsCarousel from '../components/MomentsCarousel.jsx'
import { CAPTION_MAX, momentFromForm, spotMoments } from '../moments.js'
import { fetchPublishedMoments, uploadMoment } from '../momentsApi.js'
import { textLength } from '../reviews.js'
```

b) The header comment

```js
// Port of aaslema-new's CityDetail page. Likes and visits live in Supabase (cityActivity.js);
// the plan and moments still live in the viewer's browser.
```

becomes

```js
// Port of aaslema-new's CityDetail page. Likes, visits (cityActivity.js) and moments
// (momentsApi.js) live in Supabase; the plan still lives in the viewer's browser.
```

c) `const EMPTY_MOMENT = { url: '', location: '', description: '' }` becomes:

```js
const EMPTY_MOMENT = { file: null, preview: '', spot: '', caption: '' }
```

d) Replace `const [moments, setMoments] = useState(() => readList(\`moments_${id}\`))` with:

```js
  // Approved moments: undefined while loading, [] if none (or loading failed)
  const [moments, setMoments] = useState(undefined)
```

and after `const [newMoment, setNewMoment] = useState(EMPTY_MOMENT)` add:

```js
  // null, 'uploading' or { error } — shown in the upload popup
  const [uploadStatus, setUploadStatus] = useState(null)
  const [showUnderReview, setShowUnderReview] = useState(false)
```

e) After the likes/visits `useEffect` (the one ending `}, [id, userId])`), add:

```js
  useEffect(() => {
    let current = true
    setMoments(undefined)
    fetchPublishedMoments(id).then((rows) => { if (current) setMoments(rows ?? []) })
    return () => { current = false }
  }, [id])

  // Free the photo preview when it's replaced or the popup closes
  useEffect(() => () => { if (newMoment.preview) URL.revokeObjectURL(newMoment.preview) }, [newMoment.preview])
```

f) Replace `openUpload` and `handleFinishUpload` (from `const openUpload = (location = '') => {` to the closing `}` of `handleFinishUpload`) with:

```js
  const openUpload = () => {
    setNewMoment(EMPTY_MOMENT)
    setUploadStatus(null)
    setIsUploading(true)
  }
  const closeUpload = () => {
    setIsUploading(false)
    setNewMoment(EMPTY_MOMENT)
  }
  const handleFinishUpload = async (e) => {
    e.preventDefault()
    const result = momentFromForm(newMoment, user, city)
    if (result.error) return setUploadStatus({ error: result.error })
    setUploadStatus('uploading')
    const saved = await uploadMoment(newMoment.file, result.row, user.id)
    if (saved.error) return setUploadStatus({ error: saved.error })
    setUploadStatus(null)
    closeUpload()
    setShowUnderReview(true)
  }
```

g) In the Highlights tab, `const spotMoments = moments.filter((m) => m.location === h)` becomes:

```js
                    const shots = spotMoments(moments ?? [], h)
```

and in that card replace `spotMoments` with `shots` in the three places below it (`shots.length > 0`, `shots.slice(0, 3)`, `{shots.length} {shots.length === 1 ? …}`).

h) In the Moments tab, replace everything from `{moments.length === 0 ? (` to the matching `)}` before the panel's closing `</div>` with:

```jsx
              {moments === undefined ? (
                <p className="city-sub">Loading moments…</p>
              ) : moments.length === 0 ? (
                <div className="cd-card city-empty">
                  <MapIcon size={32} />
                  <p>No moments yet. Add the first photo from {city.name}.</p>
                </div>
              ) : (
                <MomentsCarousel moments={moments} />
              )}
```

i) Replace the whole upload modal (from `{/* Moment upload modal */}` to its closing `)}`) with:

```jsx
      {/* Moment upload modal */}
      {isUploading && (
        <Modal title="Add a moment" labelId="moment-dialog-title" onClose={uploadStatus === 'uploading' ? () => {} : closeUpload} wide>
          <p className="modal__sub">Share a photo from your trip to {city.name}.</p>
          <form onSubmit={handleFinishUpload} className="moment-form" noValidate>
            <fieldset className="contact__fieldset" disabled={uploadStatus === 'uploading'}>
              {newMoment.preview ? (
                <div className="moment-form__preview">
                  <img src={newMoment.preview} alt="Preview" />
                  <button type="button" onClick={() => setNewMoment({ ...newMoment, file: null, preview: '' })}>Change photo</button>
                </div>
              ) : (
                <label className="moment-form__drop">
                  <Camera size={28} />
                  <span>Choose a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setNewMoment((m) => ({ ...m, file, preview: URL.createObjectURL(file) }))
                    }}
                  />
                </label>
              )}

              <label>
                Highlight
                <select value={newMoment.spot} onChange={(e) => setNewMoment({ ...newMoment, spot: e.target.value })}>
                  <option value="">General area</option>
                  {city.highlights.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>

              <label>
                Caption
                <textarea
                  rows={3}
                  placeholder="What made this spot special?"
                  value={newMoment.caption}
                  onChange={(e) => setNewMoment({ ...newMoment, caption: e.target.value })}
                />
                <span className="moment-form__count">{textLength(newMoment.caption.trim())} / {CAPTION_MAX}</span>
              </label>

              <button type="submit" className="btn btn--primary">
                {uploadStatus === 'uploading' ? 'Uploading…' : 'Share moment'}
              </button>
            </fieldset>
            {uploadStatus?.error && <p className="contact__error" role="alert">{uploadStatus.error}</p>}
          </form>
        </Modal>
      )}

      {/* Shown after a successful upload */}
      {showUnderReview && (
        <Modal title="Thanks for sharing!" labelId="moment-review-title" onClose={() => setShowUnderReview(false)}>
          <p className="modal__sub">Your moment is under review and will appear here once an admin approves it.</p>
          <button type="button" className="btn btn--primary moment-review__close" onClick={() => setShowUnderReview(false)}>Close</button>
        </Modal>
      )}
```

- [ ] **Step 3: Styles**

In `frontend/src/styles.css`:

1. Delete the old grid's rules: every rule whose selector starts with `.city-moments ` (with a space or `{`) or `.city-moment ` / `.city-moment__` — check with `grep -n "\.city-moment" src/styles.css` and keep only `.city-moments__head`, `.city-moments__head .city-sub`, `.city-moments__signin` and `.city-moments__signin:hover`. Confirm with `grep -rn "city-moment[ _\"]" src --include=*.jsx` that no JSX still uses a deleted class.
2. Add after the `.city-moments__signin:hover` rule:

```css
/* Moments carousel */
.moments-carousel { position: relative; }
.moments-carousel__viewport { overflow: hidden; margin: 0 -8px; cursor: grab; touch-action: pan-y; user-select: none; }
.moments-carousel__viewport:active { cursor: grabbing; }
.moments-carousel__track { display: flex; transition: transform 0.4s ease; }
.moment-card { flex: 0 0 33.333%; min-width: 0; margin: 0; padding: 0 8px; }
.moment-card__inner { height: 100%; overflow: hidden; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
.moment-card img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.moment-card figcaption { display: grid; gap: 6px; padding: 14px 16px 16px; }
.moment-card strong { color: var(--title); overflow-wrap: anywhere; }
.moment-card__caption {
  margin: 0; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden;
}
.moment-card__spot { display: flex; align-items: center; gap: 4px; margin: 0; color: var(--primary); font-size: 13px; }
.moment-card time { font-size: 13px; }
.moments-carousel__arrow {
  position: absolute; top: 36%; z-index: 2; display: grid; place-items: center; width: 40px; height: 40px;
  border: 1px solid var(--border); border-radius: 50%; background: var(--surface); color: var(--title);
  box-shadow: var(--shadow); cursor: pointer;
}
.moments-carousel__arrow--prev { left: -12px; }
.moments-carousel__arrow--next { right: -12px; }
.moments-carousel__arrow:disabled { opacity: 0.4; cursor: default; }
.moment-form__count { justify-self: end; font-size: 13px; font-weight: 400; }
.moment-review__close { margin-top: 20px; }
```

- [ ] **Step 4: Check for leftovers**

Run: `grep -n "location\|description\|readList(\`moments" src/pages/CityDetail.jsx`
Expected: only `window.location.href` lines (share code); no `moments_` key, no `newMoment.location` / `newMoment.description`.

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 6: Hand check (needs `007_moments.sql` applied and a browser)**

`npm run dev`; as a signed-in user on `/app/destinations/tozeur`, Moments tab:
- Share with no photo → "Please choose a photo."; with a photo and a 1-letter caption → caption error.
- A large phone photo, caption and highlight → "Thanks for sharing!" popup; the tab still shows "No moments yet".
- A HEIC photo in Chrome → "Couldn't read this photo. Try another one."
- After approval (Task 7): the card shows photo, name, caption, highlight, "Just now"; a 300-character caption with a long URL stays inside its card; with 1–3 moments on desktop there are no arrows.

If no browser is available, record that in the ledger and leave it to the owner.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/MomentsCarousel.jsx frontend/src/pages/CityDetail.jsx frontend/src/styles.css
git commit -m "Upload moments to Supabase and show approved ones in a carousel"
```

---

### Task 7: Admin Moments page

**Files:**
- Create: `frontend/src/pages/admin/AdminMoments.jsx`
- Modify: `frontend/src/redirects.js` (`adminPagePaths`), `frontend/src/redirects.test.js` (new describe at the end), `frontend/src/data.js` (`adminNavLinks`), `frontend/src/App.jsx` (import + `adminPages`), `frontend/src/sections/AdminLayout.jsx`, `frontend/src/styles.css`

**Interfaces:**
- Consumes: `filterReviews`, `isPublished`, `reviewCounts` (`adminReviews.js`, approval-only logic); `lastSeen` (`adminUsers.js`); `photoUrls` (Task 5); `cities`; table and bucket (Task 1).
- Produces: route `/admin/moments`; event `admin:moments-changed`.

- [ ] **Step 1: Write the failing redirect test**

Append to `frontend/src/redirects.test.js`:

```js
describe('redirectFor and /admin/moments', () => {
  it('is an admin page', () => {
    expect(adminPagePaths).toContain('/admin/moments')
  })

  it('is for admins only', () => {
    expect(redirectFor('/admin/moments', true, true)).toBe(null)
    expect(redirectFor('/admin/moments', true, false)).toBe('/app')
    expect(redirectFor('/admin/moments', false)).toBe('/signin')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/redirects.test.js`
Expected: FAIL — `adminPagePaths` does not contain `/admin/moments`.

- [ ] **Step 3: Route, link and sidebar badge**

- `frontend/src/redirects.js`: `export const adminPagePaths = ['/admin', '/admin/messages', '/admin/reviews', '/admin/moments']`
- `frontend/src/data.js` `adminNavLinks`: add `['Moments', '/admin/moments'],` after `['Reviews', '/admin/reviews'],`.
- `frontend/src/App.jsx`: add `import AdminMoments from './pages/admin/AdminMoments.jsx'` after the `AdminReviews` import; `adminPages` becomes `{ '/admin': AdminUsers, '/admin/messages': AdminMessages, '/admin/reviews': AdminReviews, '/admin/moments': AdminMoments }`.
- `frontend/src/sections/AdminLayout.jsx`:
  - lucide import adds `Camera`: `import { Camera, Compass, ExternalLink, LogOut, Mail, Menu, Star, Users, X } from 'lucide-react'`
  - `icons` gains `'/admin/moments': Camera`
  - `badges` gains `'/admin/moments': useAdminCount('moments', 'approved_at', 'admin:moments-changed'),`

- [ ] **Step 4: Write the page**

`frontend/src/pages/admin/AdminMoments.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import { cities } from '../../cities.js'
import { lastSeen } from '../../adminUsers.js'
// Tabs only look at approved_at, so the review helpers fit moments too
import { filterReviews, isPublished, reviewCounts } from '../../adminReviews.js'
import { photoUrls } from '../../momentsApi.js'

const tabs = [['pending', 'Pending'], ['published', 'Published'], ['all', 'All']]
const cityName = (id) => cities.find((c) => c.id === id)?.name ?? id

// Tells the sidebar to refresh its pending-moment count
const notifyChanged = () => window.dispatchEvent(new Event('admin:moments-changed'))

export default function AdminMoments() {
  const [moments, setMoments] = useState(null)
  const [urls, setUrls] = useState({})
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pending')

  const load = async () => {
    setError(null)
    setMoments(null)
    try {
      const { data, error } = await supabase.from('moments').select('*').order('created_at', { ascending: false })
      if (error) return setError(error)
      const rows = data ?? []
      setUrls(await photoUrls(rows.map((m) => m.image_path)))
      setMoments(rows)
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Moments - Aaslema Admin'
    load()
  }, [])

  const replace = (updated) => setMoments((list) => list.map((m) => (m.id === updated.id ? updated : m)))
  const remove = (id) => setMoments((list) => list.filter((m) => m.id !== id))

  if (error) {
    return (
      <>
        <h1>Moments</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load moments: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (moments === null) {
    return <><h1>Moments</h1><p className="admin-note">Loading moments…</p></>
  }

  const counts = reviewCounts(moments)
  const shown = filterReviews(moments, tab)

  return (
    <>
      <h1>Moments</h1>
      <div className="admin-tabs" role="tablist" aria-label="Filter moments">
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
        <p className="admin-note">{tab === 'pending' ? 'No moments waiting for approval.' : 'No moments here.'}</p>
      ) : (
        <ul className="admin-msgs">
          {shown.map((m) => <MomentItem key={m.id} moment={m} url={urls[m.image_path]} onChange={replace} onRemove={remove} />)}
        </ul>
      )}
    </>
  )
}

function MomentItem({ moment, url, onChange, onRemove }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const published = isPublished(moment)

  const act = async (action) => {
    setBusy(true)
    setFailed(false)
    try {
      await action()
      notifyChanged()
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  // .single() errors when no row matched (deleted or approved meanwhile)
  const approve = () => act(async () => {
    const { data, error } = await supabase.from('moments').update({ approved_at: new Date().toISOString() })
      .eq('id', moment.id).is('approved_at', null).select().single()
    if (error) throw error
    onChange(data)
  })

  // A delete that matches no row returns no error, so check it hit one
  const remove = () => act(async () => {
    const { data, error } = await supabase.from('moments').delete().eq('id', moment.id).select('id')
    if (error || !data?.length) throw error ?? new Error('Moment not deleted')
    // The row is gone, so the photo is private and unused; a failed removal only leaves a stray file
    await supabase.storage.from('moments').remove([moment.image_path]).catch(() => {})
    onRemove(moment.id)
  })

  return (
    <li className="admin-msg admin-moment">
      {url ? <img className="admin-moment__photo" src={url} alt={moment.caption} /> : <span className="admin-moment__photo">Photo unavailable</span>}
      <div className="admin-moment__body">
        <div className="admin-review__head">
          <strong>{cityName(moment.city_id)}</strong>
          {moment.spot && <span>· {moment.spot}</span>}
          <span className={`admin-badge ${published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>{published ? 'Published' : 'Pending'}</span>
          <span className="admin-review__date">{lastSeen(moment.created_at)}</span>
        </div>
        <p className="admin-msg__text">{moment.caption}</p>
        <p className="admin-review__by"><strong>{moment.author_name}</strong></p>
        <div className="admin-msg__actions">
          {confirming ? (
            <>
              <span className="admin-review__confirm">Delete this moment?</span>
              <button type="button" className="btn btn--sm admin-btn-danger" disabled={busy} onClick={remove}>Delete</button>
              <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
            </>
          ) : (
            <>
              {!published && <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={approve}>Approve</button>}
              <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(true)}>Delete</button>
            </>
          )}
        </div>
        {failed && <p className="admin-note--error admin-msg__error">Couldn't update this moment. Try again.</p>}
      </div>
    </li>
  )
}
```

In `frontend/src/styles.css`, add after the `.admin-btn-danger:disabled` rule:

```css
.admin-moment { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 16px; padding: 14px; }
.admin-moment__photo {
  display: grid; place-items: center; width: 160px; aspect-ratio: 4 / 3; object-fit: cover;
  border-radius: 8px; background: var(--lighter); font-size: 13px; text-align: center;
}
@media (max-width: 575px) {
  .admin-moment { grid-template-columns: 1fr; }
  .admin-moment__photo { width: 100%; }
}
```

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run` then `npm run build`
Expected: all tests PASS; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/AdminMoments.jsx frontend/src/redirects.js frontend/src/redirects.test.js frontend/src/data.js frontend/src/App.jsx frontend/src/sections/AdminLayout.jsx frontend/src/styles.css
git commit -m "Add admin Moments page with approve and delete"
```

---

### Task 8: Final check and checkpoint

**Files:**
- Modify: `CHECKPOINT.md`

- [ ] **Step 1: Full verification**

From `frontend/`: `npx vitest run` and `npm run build`. Expected: all pass; note the counts.

- [ ] **Step 2: Update the checkpoint**

- "Last updated": the latest commit hash.
- Tests line: new file and test counts.
- Supabase line: `001`–`007`; add `007_moments.sql` to the files to check.
- "Done" row: `| Destination moments: photo upload to a private Supabase bucket, admin Moments page (approve / delete), approved moments in a carousel on each destination | \`2026-10-15-city-moments\` | <first> – <last> |`
- Also add rows for the small changes since the last checkpoint: app navbar shows only the profile circle (`260646c`), review "Read more" popup (`64bc6c2`), visitors must sign in to plan (`d874d04`), Share shows Coming soon (`fd3ac5e`), landing planner button → sign in (`8b1744b`), highlight camera removed (`6be105b`), visitors get a sign-in link instead of Add moment (`695d85b`).
- "Next": add "Moments follow-ups: users delete their own moments, unpublish, likes/comments".

- [ ] **Step 3: Commit**

```bash
git add CHECKPOINT.md
git commit -m "Checkpoint: destination moments"
```

- [ ] **Step 4: Hand over**

Tell the owner to run `007_moments.sql` and follow the spec's "Manual (owner)" list.
