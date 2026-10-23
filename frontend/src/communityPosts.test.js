import { describe, expect, it } from 'vitest'
import { commentFromForm, myPostCard, parseTags, photoChanges, postMatches, postFromForm, reportFromForm, savedPhotoItems, sortPosts, tagsText } from './communityPosts.js'

const user = { email: 'leila@x.com', user_metadata: { full_name: 'Leila Ben Ali' } }
const valid = { title: '  Sunrise at Chebika ', cityId: 'tozeur', content: '  Leave Tozeur at 5am and you get the canyon to yourself. ' }

describe('postFromForm', () => {
  it('returns the trimmed row', () => {
    expect(postFromForm(valid, user)).toEqual({
      row: { title: 'Sunrise at Chebika', city_id: 'tozeur', body: 'Leave Tozeur at 5am and you get the canyon to yourself.', author_name: 'Leila Ben Ali', tags: [] },
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
      photos: [], photoUrls: [], tags: [],
    })
  })

  it('keeps the photos (paths and links) and hashtags', () => {
    const card = myPostCard({ ...row, photos: ['u/a.jpg'], photo_urls: ['https://x/a.jpg'], tags: ['oasis'] }, [])
    expect([card.photos, card.photoUrls, card.tags]).toEqual([['u/a.jpg'], ['https://x/a.jpg'], ['oasis']])
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

describe('commentFromForm', () => {
  it('returns the trimmed row with the author name', () => {
    expect(commentFromForm('  Go at sunrise!  ', user)).toEqual({ row: { body: 'Go at sunrise!', author_name: 'Leila Ben Ali' } })
  })

  it('refuses an empty comment', () => {
    expect(commentFromForm('   ', user).error).toBe('Please write a comment.')
  })

  it('refuses a comment over 1000 characters', () => {
    expect(commentFromForm('a'.repeat(1001), user).error).toBe('Your comment is too long (1000 characters max).')
    expect(commentFromForm('a'.repeat(1000), user).row.body).toHaveLength(1000)
  })
})

describe('parseTags', () => {
  it('reads hashtags with or without #, split by spaces or commas, lower case, no repeats', () => {
    expect(parseTags('  #Sahara roadtrip, #sahara  #Dar_Cherait ')).toEqual({ tags: ['sahara', 'roadtrip', 'dar_cherait'] })
  })

  it('keeps accented and Arabic letters', () => {
    expect(parseTags('#Médina #تونس')).toEqual({ tags: ['médina', 'تونس'] })
  })

  it('is empty for an empty field', () => {
    expect(parseTags('   ')).toEqual({ tags: [] })
    expect(parseTags(undefined)).toEqual({ tags: [] })
  })

  it('refuses symbols and over-long hashtags', () => {
    expect(parseTags('#good #bad-tag')).toEqual({ error: 'Hashtags use letters, numbers and _ only (30 characters max): #bad-tag' })
    expect(parseTags('#' + 'a'.repeat(31)).error).toMatch(/30 characters max/)
    expect(parseTags('#' + 'a'.repeat(30))).toEqual({ tags: ['a'.repeat(30)] })
  })

  it('allows up to 5 hashtags', () => {
    expect(parseTags('#a #b #c #d #e').tags).toHaveLength(5)
    expect(parseTags('#a #b #c #d #e #f')).toEqual({ error: 'You can add up to 5 hashtags.' })
  })
})

describe('postFromForm: hashtags', () => {
  it('saves the hashtags with the post', () => {
    expect(postFromForm({ ...valid, tags: '#oasis #canyon' }, user).row.tags).toEqual(['oasis', 'canyon'])
  })

  it('shows the hashtag problem', () => {
    expect(postFromForm({ ...valid, tags: '#a-b' }, user).error).toMatch(/letters, numbers and _ only/)
  })
})

describe('tagsText', () => {
  it('turns saved hashtags back into the form field', () => {
    expect(tagsText(['oasis', 'canyon'])).toBe('#oasis #canyon')
    expect(tagsText(null)).toBe('')
  })
})

describe('post photos in the form', () => {
  it('lists saved photos as form items', () => {
    expect(savedPhotoItems(['u/a.jpg', 'u/b.jpg'], ['https://x/a', 'https://x/b'])).toEqual([
      { key: 'u/a.jpg', path: 'u/a.jpg', url: 'https://x/a' },
      { key: 'u/b.jpg', path: 'u/b.jpg', url: 'https://x/b' },
    ])
  })

  it('splits the form photos into kept, new and removed', () => {
    const file = { name: 'new.jpg' }
    const items = [{ key: 'u/b.jpg', path: 'u/b.jpg', url: 'x' }, { key: 'n1', file, url: 'blob:1' }]
    expect(photoChanges(items, ['u/a.jpg', 'u/b.jpg'])).toEqual({ keep: ['u/b.jpg'], files: [file], removed: ['u/a.jpg'] })
  })
})

describe('postMatches', () => {
  const post = { title: 'Sunrise at Chebika', content: 'Leave at 5am for the canyon.', tags: ['oasis', 'canyon_walk'] }
  const plain = { title: 'Best couscous in Sfax', content: 'Try the fish couscous near the medina.', tags: [] }

  it('matches everything when the search is empty', () => {
    expect(postMatches(plain, '   ')).toBe(true)
  })

  it('finds words in the title or the text, in any case', () => {
    expect(postMatches(post, 'CHEBIKA')).toBe(true)
    expect(postMatches(post, '5am')).toBe(true)
    expect(postMatches(plain, 'chebika')).toBe(false)
  })

  it('finds hashtags with or without #, and parts of them', () => {
    expect(postMatches(post, '#oasis')).toBe(true)
    expect(postMatches(post, 'oasis')).toBe(true)
    expect(postMatches(post, '#can')).toBe(true)
    expect(postMatches(plain, '#oasis')).toBe(false)
  })

  it('shows every post with a hashtag for just "#"', () => {
    expect(postMatches(post, '#')).toBe(true)
    expect(postMatches(plain, '#')).toBe(false)
  })
})
