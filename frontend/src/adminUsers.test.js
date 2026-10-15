import { describe, expect, it } from 'vitest'
import { filterUsers, lastSeen, userStats } from './adminUsers.js'

const now = new Date('2026-10-15T12:00:00Z')
const DAY = 24 * 3600 * 1000
const ago = (ms) => new Date(now.getTime() - ms).toISOString()

const user = (over) => ({
  id: 'id', email: 'x@x.com', full_name: null, created_at: ago(30 * DAY),
  last_sign_in_at: null, email_confirmed_at: ago(30 * DAY), ...over,
})

describe('userStats', () => {
  it('counts nothing for an empty list', () => {
    expect(userStats([], now)).toEqual({ total: 0, newThisWeek: 0, unconfirmed: 0 })
  })

  it('counts sign-ups from exactly 7 days ago but not 1 ms earlier', () => {
    const users = [user({ created_at: ago(7 * DAY) }), user({ created_at: ago(7 * DAY + 1) }), user({ created_at: ago(DAY) })]
    expect(userStats(users, now).newThisWeek).toBe(2)
  })

  it('counts unconfirmed emails', () => {
    const users = [user({ email_confirmed_at: null }), user({}), user({ email_confirmed_at: null })]
    expect(userStats(users, now)).toEqual({ total: 3, newThisWeek: 0, unconfirmed: 2 })
  })
})

describe('filterUsers', () => {
  const users = [
    user({ id: '1', email: 'leila@mail.com', full_name: 'Leila Ben Ali' }),
    user({ id: '2', email: 'tom@mail.com', full_name: null }),
  ]
  const ids = (list) => list.map((u) => u.id)

  it('returns everyone for an empty or whitespace-only query', () => {
    expect(ids(filterUsers(users, ''))).toEqual(['1', '2'])
    expect(ids(filterUsers(users, '   '))).toEqual(['1', '2'])
  })

  it('matches name or email, ignoring case and surrounding spaces', () => {
    expect(ids(filterUsers(users, '  BEN ali '))).toEqual(['1'])
    expect(ids(filterUsers(users, 'TOM@'))).toEqual(['2'])
    expect(ids(filterUsers(users, 'mail.com'))).toEqual(['1', '2'])
  })

  it('handles users without a name', () => {
    expect(ids(filterUsers(users, 'zzz'))).toEqual([])
  })
})

describe('lastSeen', () => {
  it('says Never when there is no sign-in', () => {
    expect(lastSeen(null, now)).toBe('Never')
  })

  it('uses short relative times for the last week', () => {
    expect(lastSeen(ago(30 * 1000), now)).toBe('Just now')
    expect(lastSeen(ago(5 * 60 * 1000), now)).toBe('5m ago')
    expect(lastSeen(ago(3 * 3600 * 1000), now)).toBe('3h ago')
    expect(lastSeen(ago(2 * DAY), now)).toBe('2d ago')
  })

  it('falls back to the date after a week', () => {
    const iso = ago(10 * DAY)
    expect(lastSeen(iso, now)).toBe(new Date(iso).toLocaleDateString())
  })
})
