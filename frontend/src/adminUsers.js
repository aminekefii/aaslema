// Counting, search and dates for the admin Users page; rows come from admin_list_users().

const DAY_MS = 24 * 3600 * 1000

export function userStats(users, now = new Date()) {
  const weekAgo = now.getTime() - 7 * DAY_MS
  return {
    total: users.length,
    newThisWeek: users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
    unconfirmed: users.filter((u) => !u.email_confirmed_at).length,
  }
}

export function filterUsers(users, query) {
  const q = query.trim().toLowerCase()
  if (!q) return users
  return users.filter((u) => [u.email, u.full_name].some((v) => v?.toLowerCase().includes(q)))
}

export function lastSeen(iso, now = new Date()) {
  if (!iso) return 'Never'
  const date = new Date(iso)
  const m = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString()
}
