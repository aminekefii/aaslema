import { describe, expect, it } from 'vitest'
import { postFromForm } from './communityPosts.js'

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
