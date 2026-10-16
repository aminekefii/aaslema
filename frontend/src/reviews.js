import { displayName } from './names.js'

// Rate Your Trip reviews: form rules (matching the database limits) and landing page cards.

export const travelStyles = ['Backpacker', 'Bikepacker', 'History Traveler', 'Solo Traveler', 'Other']
export const BODY_MAX = 1000
const BODY_MIN = 10
const NAME_MAX = 100

// Postgres counts characters, not UTF-16 units, so an emoji is one
export const textLength = (s) => Array.from(s).length

export function reviewFromForm({ rating, travelStyle, body }, user) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Please choose a star rating.' }
  if (!travelStyles.includes(travelStyle)) return { error: 'Please choose your travel style.' }
  const text = (body ?? '').trim()
  if (textLength(text) < BODY_MIN) return { error: 'Please write at least 10 characters.' }
  if (textLength(text) > BODY_MAX) return { error: 'Your review is too long (1000 characters max).' }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { author_name: name, travel_style: travelStyle, rating, body: text } }
}

// Saving with no change leaves an approved review published
export const savedMessage = (row) =>
  row.approved_at ? 'Saved. Your review is still on the site.' : 'Thanks! Your review will appear on the site once an admin approves it.'

// author_avatar_url is added by reviewsApi.js; missing until 010_author_photos.sql has been run
export const cardsFromReviews = (rows) =>
  rows.map((r) => ({ key: r.id, quote: r.body, name: r.author_name, role: r.travel_style, rating: r.rating, avatar: r.author_avatar_url ?? null }))

// The samples fill the slider until the first review is approved (and if loading fails)
export const slideCards = (published, samples) => (published?.length ? cardsFromReviews(published) : samples)
