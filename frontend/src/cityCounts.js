// Like counts per destination: turning rows into a lookup and adjusting it after a click.

// Supabase sends bigint counts as strings, so convert them
export function countsFromRows(rows, key = 'likes') {
  const counts = {}
  for (const row of rows) counts[row.city_id] = Number(row[key])
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

// The n most visited cities; equal counts (and cities nobody visited) keep the list order
export function mostVisited(counts, cities, n) {
  return cities
    .map((city, i) => ({ city, i, visits: likeCount(counts, city.id) }))
    .sort((a, b) => b.visits - a.visits || a.i - b.i)
    .slice(0, n)
    .map(({ city }) => city)
}

// Visited destinations page: visits (newest first) → cards; ids no longer in the list are skipped
export function visitedCards(rows, cityList) {
  return rows.flatMap((row) => {
    const city = cityList.find((c) => c.id === row.city_id)
    return city ? [{ id: city.id, name: city.name, title: city.title, image: city.image, visitedAt: row.created_at }] : []
  })
}
