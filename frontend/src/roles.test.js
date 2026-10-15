import { describe, expect, it } from 'vitest'
import { homeFor, isAdmin } from './roles.js'

const admin = { email: 'a@x.com', app_metadata: { provider: 'email', role: 'admin' } }
const member = { email: 'm@x.com', app_metadata: { provider: 'email' } }

describe('isAdmin', () => {
  it('is true only for app_metadata.role admin', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(member)).toBe(false)
  })

  it('handles missing users and metadata', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
    expect(isAdmin({ email: 'x@x.com' })).toBe(false)
  })

  it('ignores a role in user_metadata, which users can set themselves', () => {
    expect(isAdmin({ user_metadata: { role: 'admin' }, app_metadata: {} })).toBe(false)
  })
})

describe('homeFor', () => {
  it('sends admins to /admin and everyone else to /app', () => {
    expect(homeFor(admin)).toBe('/admin')
    expect(homeFor(member)).toBe('/app')
  })
})
