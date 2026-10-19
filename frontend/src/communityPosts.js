import { cities } from './cities.js'
import { displayName } from './names.js'
import { textLength } from './reviews.js'

// Community posts: New post / Edit post form rules, matching the database limits.

const TITLE_MIN = 3
export const TITLE_MAX = 120
export const BODY_MIN = 20
export const BODY_MAX = 2000
const NAME_MAX = 100

export function postFromForm({ title, cityId, content }, user) {
  const heading = (title ?? '').trim()
  if (textLength(heading) < TITLE_MIN) return { error: 'Please write a title (at least 3 characters).' }
  if (textLength(heading) > TITLE_MAX) return { error: 'Your title is too long (120 characters max).' }
  if (!cities.some((c) => c.id === cityId)) return { error: 'Please choose a city.' }
  const body = (content ?? '').trim()
  if (textLength(body) < BODY_MIN) return { error: 'Please write at least 20 characters.' }
  if (textLength(body) > BODY_MAX) return { error: 'Your post is too long (2000 characters max).' }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { title: heading, city_id: cityId, body, author_name: name } }
}
