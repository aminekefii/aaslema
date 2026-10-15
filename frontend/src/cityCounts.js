// Like counts per destination: turning rows into a lookup and adjusting it after a click.

// Supabase sends bigint counts as strings, so convert them
export function countsFromRows(rows) {
  const counts = {}
  for (const { city_id, likes } of rows) counts[city_id] = Number(likes)
  return counts
}

export const likeCount = (counts, cityId) => counts?.[cityId] ?? 0

export function adjustCount(counts, cityId, delta) {
  return { ...counts, [cityId]: Math.max(0, likeCount(counts, cityId) + delta) }
}

export function toggleId(ids, cityId, on) {
  const rest = ids.filter((id) => id !== cityId)
  return on ? [...rest, cityId] : rest
}
