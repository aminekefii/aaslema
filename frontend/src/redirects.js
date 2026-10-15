// Where to send someone based on the page they opened and whether they're signed in.
// Pure (no window) so it can be unit-tested; paths have no trailing slash, '' is the landing page.

// Pages that exist under /app
export const appPagePaths = ['/app', '/app/destinations', '/app/festivals', '/app/community', '/app/contact', '/app/planner', '/app/profile']
// Public pages that have an /app twin
const mirrored = ['/destinations', '/festivals', '/community', '/contact']
const isCityPath = (path) => /^\/destinations\/[^/]+$/.test(path)

export const isAppPath = (path) => path === '/app' || path.startsWith('/app/')

export function redirectFor(path, signedIn) {
  if (!signedIn) return isAppPath(path) ? '/signin' : null

  if (isAppPath(path)) {
    const rest = path.slice('/app'.length)
    return appPagePaths.includes(path) || isCityPath(rest) ? null : '/app'
  }
  if (['', '/signin', '/signup'].includes(path)) return '/app'
  if (mirrored.includes(path) || isCityPath(path)) return `/app${path}`
  return null
}

// Mirrored pages keep their #anchor (shared post links); '/app' and '/signin' never do,
// since a hash on '/' can carry Supabase auth tokens from email links.
export const withHash = (target, hash) => (target.startsWith('/app/') ? target + hash : target)
