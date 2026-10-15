// Where to send someone based on the page they opened and whether they're signed in.
// Pure (no window) so it can be unit-tested; paths have no trailing slash, '' is the landing page.

// Pages that exist under /app, as the part after '/app'
const appPages = ['', '/destinations', '/festivals', '/community', '/contact', '/planner', '/profile']
// Public pages that have an /app twin
const mirrored = ['/destinations', '/festivals', '/community', '/contact']
const isCityPath = (path) => /^\/destinations\/[^/]+$/.test(path)

export const isAppPath = (path) => path === '/app' || path.startsWith('/app/')

export function redirectFor(path, signedIn) {
  if (!signedIn) return isAppPath(path) ? '/signin' : null

  if (isAppPath(path)) {
    const rest = path.slice('/app'.length)
    return appPages.includes(rest) || isCityPath(rest) ? null : '/app'
  }
  if (['', '/signin', '/signup'].includes(path)) return '/app'
  if (mirrored.includes(path) || isCityPath(path)) return `/app${path}`
  return null
}
