import { describe, expect, it } from 'vitest'
import { adminPagePaths, appPagePaths, isAdminPath, isAppPath, redirectFor, withHash } from './redirects.js'

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

describe('withHash', () => {
  it('keeps the hash on mirrored app pages', () => {
    expect(withHash('/app/community', '#post-1')).toBe('/app/community#post-1')
    expect(withHash('/app/community', '')).toBe('/app/community')
  })

  it('drops the hash for /app and /signin', () => {
    expect(withHash('/app', '#access_token=x')).toBe('/app')
    expect(withHash('/signin', '#x')).toBe('/signin')
  })
})

describe('appPagePaths', () => {
  it('allows every app page path while signed in', () => {
    for (const path of appPagePaths) expect(redirectFor(path, true)).toBe(null)
  })
})

describe('isAdminPath', () => {
  it('matches /admin and paths under it', () => {
    expect(isAdminPath('/admin')).toBe(true)
    expect(isAdminPath('/admin/users')).toBe(true)
  })

  it('does not match paths that only start with the letters "admin"', () => {
    expect(isAdminPath('/administrator')).toBe(false)
    expect(isAdminPath('/admins')).toBe(false)
    expect(isAdminPath('')).toBe(false)
  })
})

describe('redirectFor and the admin area', () => {
  it.each(['/admin', '/admin/users'])('sends signed-out visitors on %s to /signin', (path) => {
    expect(redirectFor(path, false)).toBe('/signin')
  })

  it.each(['/admin', '/admin/users'])('sends signed-in non-admins on %s to /app', (path) => {
    expect(redirectFor(path, true)).toBe('/app')
    expect(redirectFor(path, true, false)).toBe('/app')
  })

  it('lets admins stay on every admin page', () => {
    for (const path of adminPagePaths) expect(redirectFor(path, true, true)).toBe(null)
  })

  it.each(['/admin/nope', '/admin/users/extra'])('sends admins on unknown %s to /admin', (path) => {
    expect(redirectFor(path, true, true)).toBe('/admin')
  })

  it.each(['', '/signin', '/signup'])('sends admins on %s to /admin', (path) => {
    expect(redirectFor(path, true, true)).toBe('/admin')
  })

  it('lets admins use the user area like anyone else', () => {
    for (const path of appPagePaths) expect(redirectFor(path, true, true)).toBe(null)
    expect(redirectFor('/app/nope', true, true)).toBe('/app')
    expect(redirectFor('/destinations/tozeur', true, true)).toBe('/app/destinations/tozeur')
    expect(redirectFor('/community', true, true)).toBe('/app/community')
  })

  it.each(['/faq', '/reset-password', '/administrator'])('leaves admins on %s alone', (path) => {
    expect(redirectFor(path, true, true)).toBe(null)
  })

  it('leaves signed-out visitors on /administrator alone', () => {
    expect(redirectFor('/administrator', false)).toBe(null)
  })

  it('never carries a hash to /admin', () => {
    expect(withHash('/admin', '#access_token=x')).toBe('/admin')
  })
})
