import { supabase } from './supabase.js'
import { countsFromRows } from './cityCounts.js'

// Destination likes and visits in Supabase. None of these throw: pages get a plain value back.

export async function fetchLikeCounts() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('city_like_counts')
    return error ? null : countsFromRows(data ?? [])
  } catch {
    return null
  }
}

// Row level security limits this to the signed-in user's own rows
export async function fetchMyCityIds(table) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from(table).select('city_id')
    return error ? [] : (data ?? []).map((row) => row.city_id)
  } catch {
    return []
  }
}

export async function setCityFlag(table, cityId, on) {
  if (!supabase) return false
  try {
    const { error } = on
      ? await supabase.from(table).insert({ city_id: cityId })
      : await supabase.from(table).delete().eq('city_id', cityId)
    // Already liked or visited (duplicate key) is the state we wanted
    return !error || (on && error.code === '23505')
  } catch {
    return false
  }
}
