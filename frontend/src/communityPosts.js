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

// A my_posts() row → a My posts card
export function myPostCard(row, cityList) {
  return {
    id: row.id,
    cityId: row.city_id,
    cityName: cityList.find((c) => c.id === row.city_id)?.name ?? row.city_id,
    title: row.title,
    content: row.body,
    postedAt: row.created_at,
    likes: Number(row.likes ?? 0),
  }
}

const REPORT_MIN = 10
export const REPORT_MAX = 1000

// Report post form → the row to save, or the message to show
export function reportFromForm(reason) {
  const text = (reason ?? '').trim()
  if (textLength(text) < REPORT_MIN) return { error: 'Please tell us a little more (at least 10 characters).' }
  if (textLength(text) > REPORT_MAX) return { error: 'Your report is too long (1000 characters max).' }
  return { row: { reason: text } }
}

// Community sidebar "Sort by": 'latest', 'oldest' or 'liked' (newest first on a tie); returns a new list
const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
const sorters = {
  latest: newestFirst,
  oldest: (a, b) => -newestFirst(a, b),
  liked: (a, b) => b.likes - a.likes || newestFirst(a, b),
}
export const sortPosts = (posts, sort) => [...posts].sort(sorters[sort] ?? newestFirst)
