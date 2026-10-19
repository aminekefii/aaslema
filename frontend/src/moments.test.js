import { describe, expect, it } from 'vitest'
import { PHOTO_MAX_BYTES, canApprove, feedMomentCard, hasHeicHeader, isHeic, momentFromForm, momentPath, myMomentCard, spotMoments, toggleMomentLike } from './moments.js'

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

  it('accepts iPhone HEIC photos, even when the browser gives no file type', () => {
    expect(momentFromForm({ ...valid, file: { name: 'IMG_0001.HEIC', type: '', size: 10 } }, user, city).row).toBeDefined()
    expect(momentFromForm({ ...valid, file: { name: 'IMG_0001.heif', type: '', size: 10 } }, user, city).row).toBeDefined()
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

describe('canApprove', () => {
  it('needs a pending moment whose photo loaded', () => {
    expect(canApprove({ approved_at: null }, 'https://signed/url')).toBe(true)
    expect(canApprove({ approved_at: null }, undefined)).toBe(false)
    expect(canApprove({ approved_at: '2026-10-15T10:00:00Z' }, 'https://signed/url')).toBe(false)
  })
})

describe('isHeic', () => {
  it('spots HEIC/HEIF photos by type or by name', () => {
    expect(isHeic({ name: 'a.jpg', type: 'image/heic' })).toBe(true)
    expect(isHeic({ name: 'a', type: 'image/heif' })).toBe(true)
    expect(isHeic({ name: 'IMG_0001.HEIC', type: '' })).toBe(true)
    expect(isHeic({ name: 'IMG_0001.heif', type: 'application/octet-stream' })).toBe(true)
    expect(isHeic({ name: 'IMG_0001.jpg', type: 'image/jpeg' })).toBe(false)
    expect(isHeic({ name: 'heic.png', type: 'image/png' })).toBe(false)
    expect(isHeic({ type: '' })).toBe(false)
  })
})

describe('hasHeicHeader', () => {
  const header = (brand) => new Uint8Array([0, 0, 0, 0x28, ...new TextEncoder().encode('ftyp' + brand)])

  it('spots HEIC content whatever the file is called', () => {
    expect(hasHeicHeader(header('heic'))).toBe(true)
    expect(hasHeicHeader(header('heix'))).toBe(true)
    expect(hasHeicHeader(header('mif1'))).toBe(true)
    expect(hasHeicHeader(header('avif'))).toBe(false)
    expect(hasHeicHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false)
    expect(hasHeicHeader(new Uint8Array([0, 0]))).toBe(false)
  })
})

describe('toggleMomentLike', () => {
  it('likes and unlikes, adjusting the count', () => {
    const moment = { id: 'm1', likes: 4, liked: false }
    expect(toggleMomentLike(moment)).toEqual({ id: 'm1', likes: 5, liked: true })
    expect(toggleMomentLike({ ...moment, liked: true })).toEqual({ id: 'm1', likes: 3, liked: false })
  })

  it('never goes below zero', () => {
    expect(toggleMomentLike({ likes: 0, liked: true })).toEqual({ likes: 0, liked: false })
  })
})

describe('myMomentCard', () => {
  const list = [{ id: 'tozeur', name: 'Tozeur' }]
  const row = {
    id: 'm1', city_id: 'tozeur', spot: 'Chebika', caption: 'Oasis at dawn', image_path: 'u/p.jpg',
    created_at: '2026-10-16T10:00:00Z', approved_at: null, likes: '3', url: 'https://x/p.jpg',
  }

  it('builds a card for a pending moment', () => {
    expect(myMomentCard(row, list)).toEqual({
      key: 'm1', url: 'https://x/p.jpg', cityName: 'Tozeur', spot: 'Chebika', caption: 'Oasis at dawn',
      published: false, postedAt: '2026-10-16T10:00:00Z', likes: 3,
    })
  })

  it('marks an approved moment as published', () => {
    expect(myMomentCard({ ...row, approved_at: '2026-10-16T12:00:00Z' }, list).published).toBe(true)
  })

  it('falls back to the city id, no photo and no likes', () => {
    const card = myMomentCard({ ...row, city_id: 'gone', url: undefined, likes: undefined }, list)
    expect(card.cityName).toBe('gone')
    expect(card.url).toBeNull()
    expect(card.likes).toBe(0)
  })
})

describe('feedMomentCard', () => {
  const row = { id: 'm1', city_id: 'tozeur', caption: 'Salt lake at dawn', url: 'https://x/m1.jpg' }

  it('adds the destination name and link', () => {
    expect(feedMomentCard(row, [{ id: 'tozeur', name: 'Tozeur' }])).toEqual({ ...row, cityName: 'Tozeur', href: '/app/destinations/tozeur' })
  })

  it('shows the city id when the destination is no longer listed', () => {
    expect(feedMomentCard(row, []).cityName).toBe('tozeur')
  })
})
