import { describe, expect, it } from 'vitest'
import { isAppPath, redirectFor } from './redirects.js'

describe('isAppPath', () => {
  it('matches /app and paths under it', () => {
    expect(isAppPath('/app')).toBe(true)
    expect(isAppPath('/app/festivals')).toBe(true)
  })

  it('does not match paths that only start with the letters "app"', () => {
    expect(isAppPath('/application')).toBe(false)
    expect(isAppPath('/apple')).toBe(false)
    expect(isAppPath('')).toBe(false)
  })
})

describe('redirectFor when signed out', () => {
  it.each(['/app', '/app/profile', '/app/destinations/tozeur', '/app/nope'])('sends %s to /signin', (path) => {
    expect(redirectFor(path, false)).toBe('/signin')
  })

  it.each(['', '/destinations', '/destinations/tozeur', '/festivals', '/community', '/contact', '/faq', '/signin', '/signup', '/reset-password', '/application'])('leaves %s alone', (path) => {
    expect(redirectFor(path, false)).toBe(null)
  })
})

describe('redirectFor when signed in', () => {
  it.each(['', '/signin', '/signup'])('sends %s to /app', (path) => {
    expect(redirectFor(path, true)).toBe('/app')
  })

  it.each([
    ['/destinations', '/app/destinations'],
    ['/destinations/tozeur', '/app/destinations/tozeur'],
    ['/festivals', '/app/festivals'],
    ['/community', '/app/community'],
    ['/contact', '/app/contact'],
  ])('sends %s to %s', (path, target) => {
    expect(redirectFor(path, true)).toBe(target)
  })

  it.each(['/app', '/app/destinations', '/app/destinations/tozeur', '/app/festivals', '/app/community', '/app/contact', '/app/planner', '/app/profile'])('stays on %s', (path) => {
    expect(redirectFor(path, true)).toBe(null)
  })

  it.each(['/app/nope', '/app/faq', '/app/signin', '/app/destinations/tozeur/extra'])('sends unknown app path %s to /app', (path) => {
    expect(redirectFor(path, true)).toBe('/app')
  })

  it.each(['/faq', '/reset-password', '/application', '/unknown'])('leaves %s alone', (path) => {
    expect(redirectFor(path, true)).toBe(null)
  })
})
