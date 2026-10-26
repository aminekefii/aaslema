import { describe, expect, it } from 'vitest'
import { isTooOften } from './rateLimit.js'

describe('isTooOften', () => {
  it('spots the posting-limit error only', () => {
    expect(isTooOften({ code: 'P0429', message: 'too many in the last hour' })).toBe(true)
    expect(isTooOften({ code: '23505' })).toBe(false)
    expect(isTooOften(null)).toBe(false)
  })
})
