import { describe, expect, it } from 'vitest'
import { cardsFromReviews, reviewFromForm, savedMessage, slideCards, textLength, travelStyles } from './reviews.js'

const user = { email: 'leila@x.com', user_metadata: { full_name: 'Leila Ben Ali' } }
const valid = { rating: 4, travelStyle: 'Bikepacker', body: 'Great roads and kind people.' }

describe('reviewFromForm', () => {
  it('returns the row to save', () => {
    expect(reviewFromForm(valid, user)).toEqual({
      row: { author_name: 'Leila Ben Ali', travel_style: 'Bikepacker', rating: 4, body: 'Great roads and kind people.' },
    })
  })

  it.each([0, 6, 2.5, '4', undefined])('rejects rating %s', (rating) => {
    expect(reviewFromForm({ ...valid, rating }, user)).toEqual({ error: 'Please choose a star rating.' })
  })

  it.each([1, 5])('accepts rating %s', (rating) => {
    expect(reviewFromForm({ ...valid, rating }, user).row.rating).toBe(rating)
  })

  it('accepts every travel style', () => {
    for (const travelStyle of travelStyles) expect(reviewFromForm({ ...valid, travelStyle }, user).row.travel_style).toBe(travelStyle)
  })

  it.each(['', 'Tourist', 'bikepacker'])('rejects travel style "%s"', (travelStyle) => {
    expect(reviewFromForm({ ...valid, travelStyle }, user)).toEqual({ error: 'Please choose your travel style.' })
  })

  it('trims the review', () => {
    expect(reviewFromForm({ ...valid, body: '  Lovely trip!\n' }, user).row.body).toBe('Lovely trip!')
  })

  it('needs at least 10 characters after trimming', () => {
    expect(reviewFromForm({ ...valid, body: '   123456789   ' }, user)).toEqual({ error: 'Please write at least 10 characters.' })
    expect(reviewFromForm({ ...valid, body: undefined }, user)).toEqual({ error: 'Please write at least 10 characters.' })
    expect(reviewFromForm({ ...valid, body: '1234567890' }, user).row.body).toBe('1234567890')
  })

  it('allows up to 1000 characters', () => {
    expect(reviewFromForm({ ...valid, body: 'a'.repeat(1000) }, user).row.body).toHaveLength(1000)
    expect(reviewFromForm({ ...valid, body: 'a'.repeat(1001) }, user)).toEqual({ error: 'Your review is too long (1000 characters max).' })
  })

  it('counts an emoji as one character, like the database', () => {
    expect(reviewFromForm({ ...valid, body: '😀'.repeat(9) }, user)).toEqual({ error: 'Please write at least 10 characters.' })
    expect(reviewFromForm({ ...valid, body: '😀'.repeat(1000) }, user).row).toBeDefined()
    expect(textLength('😀😀')).toBe(2)
  })

  it('checks the rating first', () => {
    expect(reviewFromForm({ rating: 0, travelStyle: '', body: '' }, user)).toEqual({ error: 'Please choose a star rating.' })
  })

  it('uses the email before @ without a full name', () => {
    expect(reviewFromForm(valid, { email: 'tom.r@x.com', user_metadata: {} }).row.author_name).toBe('tom.r')
  })

  it('cuts the name at 100 characters', () => {
    const long = { email: 'x@x.com', user_metadata: { full_name: 'é'.repeat(120) } }
    expect(textLength(reviewFromForm(valid, long).row.author_name)).toBe(100)
  })
})

describe('savedMessage', () => {
  it('says a pending review waits for an admin', () => {
    expect(savedMessage({ approved_at: null })).toBe('Thanks! Your review will appear on the site once an admin approves it.')
  })

  it('says an unchanged published review is still on the site', () => {
    expect(savedMessage({ approved_at: '2026-10-15T10:00:00Z' })).toBe('Saved. Your review is still on the site.')
  })
})

describe('cardsFromReviews', () => {
  it('turns published rows into slider cards', () => {
    expect(cardsFromReviews([{ id: 'r1', author_name: 'Leila', travel_style: 'Bikepacker', rating: 4, body: 'Great.' }])).toEqual([
      { key: 'r1', quote: 'Great.', name: 'Leila', role: 'Bikepacker', rating: 4, avatar: null },
    ])
  })
})

describe('slideCards', () => {
  const samples = [{ name: 'Sample' }]
  const rows = [{ id: 'r1', author_name: 'Leila', travel_style: 'Other', rating: 5, body: 'Great trip.' }]

  it('shows the samples while loading, on error or with no published reviews', () => {
    expect(slideCards(null, samples)).toBe(samples)
    expect(slideCards([], samples)).toBe(samples)
  })

  it('shows only published reviews when there are some', () => {
    expect(slideCards(rows, samples)).toEqual(cardsFromReviews(rows))
  })
})
