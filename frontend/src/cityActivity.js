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

export async function fetchVisitCounts() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('city_visit_counts')
    return error ? null : countsFromRows(data ?? [], 'visits')
  } catch {
    return null
  }
}

// Row level security limits this to the signed-in user's own rows; null if loading failed
export async function fetchMyCityIds(table) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from(table).select('city_id')
    return error ? null : (data ?? []).map((row) => row.city_id)
  } catch {
    return null
  }
}

// The signed-in user's visits with when they were marked, newest first; null if loading failed
export async function fetchMyVisits() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('city_visits').select('city_id, created_at').order('created_at', { ascending: false })
    return error ? null : (data ?? [])
  } catch {
    return null
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
