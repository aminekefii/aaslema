import { describe, expect, it } from 'vitest'
import { approvalChange, filterReviews, isPublished, reviewCounts } from './adminReviews.js'

const pending = { id: 'a', approved_at: null }
const published = { id: 'b', approved_at: '2026-10-15T10:00:00Z' }
const reviews = [pending, published, { id: 'c', approved_at: null }]

describe('isPublished', () => {
  it('is true only with an approval date', () => {
    expect(isPublished(published)).toBe(true)
    expect(isPublished(pending)).toBe(false)
  })
})

describe('filterReviews', () => {
  it('keeps pending, published or all reviews, in order', () => {
    expect(filterReviews(reviews, 'pending').map((r) => r.id)).toEqual(['a', 'c'])
    expect(filterReviews(reviews, 'published').map((r) => r.id)).toEqual(['b'])
    expect(filterReviews(reviews, 'all')).toBe(reviews)
  })
})

describe('reviewCounts', () => {
  it('counts each tab', () => {
    expect(reviewCounts(reviews)).toEqual({ pending: 2, published: 1, all: 3 })
    expect(reviewCounts([])).toEqual({ pending: 0, published: 0, all: 0 })
  })
})

describe('approvalChange', () => {
  const now = '2026-10-15T12:00:00.000Z'

  it('approves a pending review only if its text is the version the admin saw', () => {
    expect(approvalChange({ id: 'a', approved_at: null, updated_at: '2026-10-15T09:00:00.123456+00:00' }, now)).toEqual({
      values: { approved_at: now },
      match: { id: 'a', updated_at: '2026-10-15T09:00:00.123456+00:00' },
    })
  })

  it('unpublishes a published review', () => {
    expect(approvalChange({ id: 'b', approved_at: '2026-10-15T10:00:00Z', updated_at: 'u' }, now)).toEqual({
      values: { approved_at: null },
      match: { id: 'b', updated_at: 'u' },
    })
  })
})
