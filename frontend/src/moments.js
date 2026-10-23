import { displayName } from './names.js'
import { textLength } from './reviews.js'

// Destination moments: upload form rules (matching the database limits) and helpers.

export const CAPTION_MAX = 300
const CAPTION_MIN = 3
const NAME_MAX = 100
// Before shrinking; the uploaded JPEG is much smaller (bucket limit 2 MB)
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024

// iPhone photos; Chrome on Windows often gives them no file type, so the name counts too
export const isHeic = (file) => /^image\/hei[cf]$/.test(file.type ?? '') || /\.hei[cf]$/i.test(file.name ?? '')

// HEIC content from the file's first 12 bytes ("ftyp" + brand), for HEIC photos saved as .JPG
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']
export function hasHeicHeader(bytes) {
  if (bytes.length < 12) return false
  const text = String.fromCharCode(...bytes.slice(4, 12))
  return text.startsWith('ftyp') && HEIC_BRANDS.includes(text.slice(4))
}

// A HEIC file cut short (some copies from an iPhone are): a top-level box claims to run past the
// end of the file, so part of the photo is missing and would decode as green blocks.
export async function heifIsIncomplete(blob) {
  let p = 0
  while (p + 8 <= blob.size) {
    const view = new DataView(await blob.slice(p, p + 16).arrayBuffer())
    let size = view.getUint32(0)
    if (size === 1 && view.byteLength >= 16) size = Number(view.getBigUint64(8))
    if (size === 0) return false
    if (size < 8) return true
    if (p + size > blob.size) return true
    p += size
  }
  return false
}

export function momentFromForm({ file, caption, spot }, user, city) {
  if (!file) return { error: 'Please choose a photo.' }
  if (!file.type?.startsWith('image/') && !isHeic(file)) return { error: 'Please choose an image file.' }
  if (file.size > PHOTO_MAX_BYTES) return { error: 'This photo is too large (15 MB max).' }
  const text = (caption ?? '').trim()
  if (textLength(text) < CAPTION_MIN) return { error: 'Please write a caption (at least 3 characters).' }
  if (textLength(text) > CAPTION_MAX) return { error: 'Your caption is too long (300 characters max).' }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { city_id: city.id, spot: city.highlights.includes(spot) ? spot : null, caption: text, author_name: name } }
}

export const momentPath = (userId, id) => `${userId}/${id}.jpg`

export const spotMoments = (moments, spot) => moments.filter((m) => m.spot === spot)

// Admins approve only what they can see: a pending moment whose photo loaded
export const canApprove = (moment, url) => !moment.approved_at && Boolean(url)

// Instant like / unlike on a card, before the database confirms it
export const toggleMomentLike = (moment) => ({
  ...moment,
  liked: !moment.liked,
  likes: Math.max(0, moment.likes + (moment.liked ? -1 : 1)),
})

// A row of my_moments() (plus its photo link) → a My moments card
export function myMomentCard(row, cityList) {
  return {
    key: row.id,
    url: row.url ?? null,
    cityName: cityList.find((c) => c.id === row.city_id)?.name ?? row.city_id,
    spot: row.spot,
    caption: row.caption,
    published: Boolean(row.approved_at),
    postedAt: row.created_at,
    likes: Number(row.likes ?? 0),
  }
}

// A feed_moments() row (plus its photo link) → a Feed card that opens its destination
export const feedMomentCard = (row, cityList) => ({
  ...row,
  cityName: cityList.find((c) => c.id === row.city_id)?.name ?? row.city_id,
  href: `/app/destinations/${row.city_id}`,
  // Like fields come from 020_feed_moment_likes.sql; before it is run they are missing
  likes: Number(row.likes ?? 0),
  liked: Boolean(row.liked),
  mine: Boolean(row.mine),
})
