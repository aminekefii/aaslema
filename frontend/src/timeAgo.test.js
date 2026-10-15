import { describe, expect, it } from 'vitest'
import { timeAgo } from './timeAgo.js'

const now = new Date('2026-10-15T12:00:00Z')
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const ago = (ms) => new Date(now.getTime() - ms).toISOString()

describe('timeAgo', () => {
  it('says "Just now" under a minute and for future dates', () => {
    expect(timeAgo(ago(59 * 1000), now)).toBe('Just now')
    expect(timeAgo(ago(-5 * MIN), now)).toBe('Just now')
  })

  it('counts minutes under an hour', () => {
    expect(timeAgo(ago(MIN), now)).toBe('1 min ago')
    expect(timeAgo(ago(59 * MIN), now)).toBe('59 min ago')
  })

  it('counts hours under a day', () => {
    expect(timeAgo(ago(60 * MIN), now)).toBe('1h ago')
    expect(timeAgo(ago(5 * HOUR), now)).toBe('5h ago')
    expect(timeAgo(ago(24 * HOUR - MIN), now)).toBe('23h ago')
  })

  it('says "a day ago" from 24 to 48 hours', () => {
    expect(timeAgo(ago(24 * HOUR), now)).toBe('a day ago')
    expect(timeAgo(ago(47 * HOUR), now)).toBe('a day ago')
  })

  it('counts days under a week', () => {
    expect(timeAgo(ago(48 * HOUR), now)).toBe('2 days ago')
    expect(timeAgo(ago(6 * DAY), now)).toBe('6 days ago')
  })

  it('says "a week ago" from 7 to 13 days', () => {
    expect(timeAgo(ago(7 * DAY), now)).toBe('a week ago')
    expect(timeAgo(ago(13 * DAY), now)).toBe('a week ago')
  })

  it('counts weeks under 30 days', () => {
    expect(timeAgo(ago(14 * DAY), now)).toBe('2 weeks ago')
    expect(timeAgo(ago(29 * DAY), now)).toBe('4 weeks ago')
  })

  it('shows the date from 30 days on', () => {
    const iso = ago(30 * DAY)
    expect(timeAgo(iso, now)).toBe(new Date(iso).toLocaleDateString())
  })
})
