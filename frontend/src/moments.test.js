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
