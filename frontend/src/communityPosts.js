import { cities } from './cities.js'
import { displayName } from './names.js'
import { textLength } from './reviews.js'

// Community posts: New post / Edit post form rules, matching the database limits.

const TITLE_MIN = 3
export const TITLE_MAX = 120
export const BODY_MIN = 20
export const BODY_MAX = 2000
const NAME_MAX = 100
export const TAGS_MAX = 5
const TAG = /^[\p{L}\p{N}_]{1,30}$/u
export const PHOTOS_MAX = 3

// Hashtags field → lower-case hashtags without # (up to 5, no repeats), or the message to show.
// 023_post_photos_tags.sql allows the same.
export function parseTags(text) {
  const words = (text ?? '').split(/[\s,]+/).map((w) => w.replace(/^#+/, '').toLowerCase()).filter(Boolean)
  const bad = words.find((w) => !TAG.test(w))
  if (bad) return { error: `Hashtags use letters, numbers and _ only (30 characters max): #${bad}` }
  const tags = [...new Set(words)]
  if (tags.length > TAGS_MAX) return { error: 'You can add up to 5 hashtags.' }
  return { tags }
}

// Saved hashtags → the Hashtags field
export const tagsText = (tags) => (tags ?? []).map((t) => `#${t}`).join(' ')

export function postFromForm(form, user) {
  const { title, cityId, content } = form
  const heading = (title ?? '').trim()
  if (textLength(heading) < TITLE_MIN) return { error: 'Please write a title (at least 3 characters).' }
  if (textLength(heading) > TITLE_MAX) return { error: 'Your title is too long (120 characters max).' }
  if (!cities.some((c) => c.id === cityId)) return { error: 'Please choose a city.' }
  const body = (content ?? '').trim()
  if (textLength(body) < BODY_MIN) return { error: 'Please write at least 20 characters.' }
  if (textLength(body) > BODY_MAX) return { error: 'Your post is too long (2000 characters max).' }
  const { tags, error } = parseTags(form.tags)
  if (error) return { error }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { title: heading, city_id: cityId, body, author_name: name, tags } }
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
    photos: row.photos ?? [],
    photoUrls: row.photo_urls ?? [],
    tags: row.tags ?? [],
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

export const COMMENT_MAX = 1000

// Comment box → the row to save, or the message to show
export function commentFromForm(text, user) {
  const body = (text ?? '').trim()
  if (!body) return { error: 'Please write a comment.' }
  if (textLength(body) > COMMENT_MAX) return { error: 'Your comment is too long (1000 characters max).' }
  const name = Array.from(displayName(user)).slice(0, NAME_MAX).join('')
  return { row: { body, author_name: name } }
}

// Community sidebar "Sort by": 'latest', 'oldest' or 'liked' (newest first on a tie); returns a new list
const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
const sorters = {
  latest: newestFirst,
  oldest: (a, b) => -newestFirst(a, b),
  liked: (a, b) => b.likes - a.likes || newestFirst(a, b),
}
export const sortPosts = (posts, sort) => [...posts].sort(sorters[sort] ?? newestFirst)

// Saved photo paths and links → the photo items of the post form
export const savedPhotoItems = (paths = [], urls = []) => paths.map((path, i) => ({ key: path, path, url: urls[i] }))

// Post form photo items (saved ones have a path, new ones a file) against the saved paths
export function photoChanges(items, savedPaths = []) {
  const keep = items.filter((p) => p.path).map((p) => p.path)
  return { keep, files: items.filter((p) => p.file).map((p) => p.file), removed: savedPaths.filter((p) => !keep.includes(p)) }
}

// Community search box: title or text, or hashtags ("#oasis", "oasis" or part of one); just "#" lists posts with hashtags
export function postMatches(post, search) {
  const query = (search ?? '').trim().toLowerCase()
  if (!query) return true
  const tags = post.tags ?? []
  if (query === '#') return tags.length > 0
  const tagQuery = query.replace(/^#+/, '')
  return post.title.toLowerCase().includes(query) || post.content.toLowerCase().includes(query) || tags.some((t) => t.includes(tagQuery))
}

// Sidebar Hashtag field → the hashtag to filter by (lower case, no #), '' for none
export const tagFilterText = (text) => (text ?? '').trim().replace(/^#+/, '').toLowerCase()

// Sidebar Hashtag filter: matches while typing ("sah" finds #sahara); an empty field matches every post
export function postHasTag(post, text) {
  const wanted = tagFilterText(text)
  return !wanted || (post.tags ?? []).some((t) => t.includes(wanted))
}

// Landing page "Stories & Tips": the n most liked community_feed() rows (newest first on a tie) as cards
export function storyCards(rows, cityList, n = 3) {
  const liked = [...rows].sort((a, b) => b.likes - a.likes || new Date(b.created_at) - new Date(a.created_at))
  return liked.slice(0, n).map((r) => {
    const city = cityList.find((c) => c.id === r.city_id)
    return {
      id: r.id,
      title: r.title,
      tag: city?.name ?? r.city_id,
      date: new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }),
      likes: r.likes,
      comments: r.comments,
      image: r.photo_urls?.[0] ?? city?.image ?? null,
      href: `/community#${r.id}`,
    }
  })
}
