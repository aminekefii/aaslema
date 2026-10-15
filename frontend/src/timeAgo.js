// "5h ago", "a day ago"… for moment cards; dates in the future (clock skew) count as now.
export function timeAgo(iso, now = new Date()) {
  const m = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  if (h < 48) return 'a day ago'
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} days ago`
  if (d < 14) return 'a week ago'
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  return new Date(iso).toLocaleDateString()
}
