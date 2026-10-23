import { describe, expect, it } from 'vitest'
import { myPostCard, postFromForm, reportFromForm, sortPosts } from './communityPosts.js'

const user = { email: 'leila@x.com', user_metadata: { full_name: 'Leila Ben Ali' } }
const valid = { title: '  Sunrise at Chebika ', cityId: 'tozeur', content: '  Leave Tozeur at 5am and you get the canyon to yourself. ' }

describe('postFromForm', () => {
  it('returns the trimmed row', () => {
    expect(postFromForm(valid, user)).toEqual({
      row: { title: 'Sunrise at Chebika', city_id: 'tozeur', body: 'Leave Tozeur at 5am and you get the canyon to yourself.', author_name: 'Leila Ben Ali' },
    })
  })

  it('needs a title', () => {
    expect(postFromForm({ ...valid, title: '  ab ' }, user)).toEqual({ error: 'Please write a title (at least 3 characters).' })
  })

  it('limits the title', () => {
    expect(postFromForm({ ...valid, title: 'a'.repeat(120) }, user).row).toBeDefined()
    expect(postFromForm({ ...valid, title: 'a'.repeat(121) }, user)).toEqual({ error: 'Your title is too long (120 characters max).' })
  })

  it('counts an emoji as one character', () => {
    expect(postFromForm({ ...valid, title: '😀'.repeat(120) }, user).row).toBeDefined()
  })

  it('needs a known city', () => {
    expect(postFromForm({ ...valid, cityId: '' }, user)).toEqual({ error: 'Please choose a city.' })
    expect(postFromForm({ ...valid, cityId: 'atlantis' }, user)).toEqual({ error: 'Please choose a city.' })
  })

  it('needs 20 characters of post', () => {
    expect(postFromForm({ ...valid, content: `  ${'a'.repeat(19)}   ` }, user)).toEqual({ error: 'Please write at least 20 characters.' })
    expect(postFromForm({ ...valid, content: 'a'.repeat(20) }, user).row).toBeDefined()
  })

  it('limits the post', () => {
    expect(postFromForm({ ...valid, content: 'a'.repeat(2000) }, user).row).toBeDefined()
    expect(postFromForm({ ...valid, content: 'a'.repeat(2001) }, user)).toEqual({ error: 'Your post is too long (2000 characters max).' })
  })

  it('checks the title first', () => {
    expect(postFromForm({ title: '', cityId: '', content: '' }, user)).toEqual({ error: 'Please write a title (at least 3 characters).' })
  })

  it('uses the email name when there is no full name', () => {
    expect(postFromForm(valid, { email: 'leila@x.com' }).row.author_name).toBe('leila')
  })

  it('cuts the author name to 100 characters', () => {
    const long = { user_metadata: { full_name: 'L'.repeat(150) } }
    expect(postFromForm(valid, long).row.author_name).toBe('L'.repeat(100))
  })
})

describe('myPostCard', () => {
  const row = { id: 'p1', city_id: 'tozeur', title: 'Sunrise', body: 'Leave at 5am.', created_at: '2026-10-19T08:00:00Z', likes: '12' }

  it('maps a my_posts() row to a card', () => {
    expect(myPostCard(row, [{ id: 'tozeur', name: 'Tozeur' }])).toEqual({
      id: 'p1', cityId: 'tozeur', cityName: 'Tozeur', title: 'Sunrise', content: 'Leave at 5am.', postedAt: '2026-10-19T08:00:00Z', likes: 12,
    })
  })

  it('shows the city id when the city is no longer listed', () => {
    expect(myPostCard(row, []).cityName).toBe('tozeur')
  })

  it('counts missing likes as zero', () => {
    expect(myPostCard({ ...row, likes: null }, []).likes).toBe(0)
  })
})

describe('reportFromForm', () => {
  it('returns the trimmed reason', () => {
    expect(reportFromForm('  Spam: the same advert in every forum. ')).toEqual({ row: { reason: 'Spam: the same advert in every forum.' } })
  })

  it('needs 10 characters', () => {
    expect(reportFromForm(`  ${'a'.repeat(9)}  `)).toEqual({ error: 'Please tell us a little more (at least 10 characters).' })
    expect(reportFromForm('a'.repeat(10)).row).toBeDefined()
  })

  it('limits the reason', () => {
    expect(reportFromForm('a'.repeat(1000)).row).toBeDefined()
    expect(reportFromForm('a'.repeat(1001))).toEqual({ error: 'Your report is too long (1000 characters max).' })
  })
})

describe('sortPosts', () => {
  const a = { id: 'a', createdAt: '2026-10-01T10:00:00Z', likes: 2 }
  const b = { id: 'b', createdAt: '2026-10-03T10:00:00Z', likes: 5 }
  const c = { id: 'c', createdAt: '2026-10-02T10:00:00Z', likes: 5 }
  const ids = (posts) => posts.map((p) => p.id)

  it('puts the newest first for latest', () => {
    expect(ids(sortPosts([a, b, c], 'latest'))).toEqual(['b', 'c', 'a'])
  })

  it('puts the oldest first for oldest', () => {
    expect(ids(sortPosts([a, b, c], 'oldest'))).toEqual(['a', 'c', 'b'])
  })

  it('puts the most liked first, newest first on a tie', () => {
    expect(ids(sortPosts([a, c, b], 'liked'))).toEqual(['b', 'c', 'a'])
  })

  it('leaves the list it was given alone', () => {
    const list = [a, b, c]
    sortPosts(list, 'oldest')
    expect(ids(list)).toEqual(['a', 'b', 'c'])
  })
})
