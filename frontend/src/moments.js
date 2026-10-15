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
