// Where to send someone based on the page they opened, whether they're signed in and whether they're an admin.
// Pure (no window) so it can be unit-tested; paths have no trailing slash, '' is the landing page.

// Pages that exist under /app
export const appPagePaths = ['/app', '/app/destinations', '/app/festivals', '/app/community', '/app/contact', '/app/profile', '/app/profile/plan', '/app/profile/planner', '/app/profile/visited', '/app/profile/posts', '/app/profile/edit', '/app/profile/review']

// Pages that moved; old links keep working
const moved = { '/app/review': '/app/profile/review', '/app/planner': '/app/profile/planner' }

// Pages that exist under /admin (admins only)
export const adminPagePaths = ['/admin', '/admin/messages', '/admin/reviews', '/admin/moments', '/admin/reports']


// Public pages that have an /app twin
const mirrored = ['/destinations', '/festivals', '/community', '/contact']
const isCityPath = (path) => /^\/destinations\/[^/]+$/.test(path)

export const isAppPath = (path) => path === '/app' || path.startsWith('/app/')
export const isAdminPath = (path) => path === '/admin' || path.startsWith('/admin/')

export function redirectFor(path, signedIn, isAdmin = false) {
  if (!signedIn) return isAppPath(path) || isAdminPath(path) ? '/signin' : null

  if (isAdminPath(path)) {
    if (!isAdmin) return '/app'
    return adminPagePaths.includes(path) ? null : '/admin'
  }
  if (isAppPath(path)) {
    if (moved[path]) return moved[path]
    const rest = path.slice('/app'.length)
    return appPagePaths.includes(path) || isCityPath(rest) ? null : '/app'
  }
  if (['', '/signin', '/signup'].includes(path)) return isAdmin ? '/admin' : '/app'
  if (mirrored.includes(path) || isCityPath(path)) return `/app${path}`
  return null
}

// Mirrored pages keep their #anchor (shared post links); '/app' and '/signin' never do,
// since a hash on '/' can carry Supabase auth tokens from email links.
export const withHash = (target, hash) => (target.startsWith('/app/') ? target + hash : target)
