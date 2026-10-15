import { describe, expect, it } from 'vitest'
import { displayName, initials } from './names.js'

describe('displayName', () => {
  it('uses the full name, trimmed', () => {
    expect(displayName({ email: 'leila@x.com', user_metadata: { full_name: '  Leila Ben Ali ' } })).toBe('Leila Ben Ali')
  })

  it('falls back to the email before @ when the full name is missing or blank', () => {
    expect(displayName({ email: 'tom.r@x.com', user_metadata: {} })).toBe('tom.r')
    expect(displayName({ email: 'tom.r@x.com', user_metadata: { full_name: '   ' } })).toBe('tom.r')
    expect(displayName({ email: 'tom.r@x.com' })).toBe('tom.r')
  })
})

describe('initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initials('Leila Ben Ali')).toBe('LB')
    expect(initials('tom@x.com')).toBe('T')
  })

  it('ignores extra spaces', () => {
    expect(initials('  leila   ben ')).toBe('LB')
  })

  it('keeps an emoji whole', () => {
    expect(initials('😀 Sam')).toBe('😀S')
  })

  it('is empty for an empty name', () => {
    expect(initials('')).toBe('')
  })
})
