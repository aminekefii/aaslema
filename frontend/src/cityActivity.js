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

// Row level security limits this to the signed-in user's own rows; null if loading failed.
// `column` is festival_id for festival_plans.
export async function fetchMyCityIds(table, column = 'city_id') {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from(table).select(column)
    return error ? null : (data ?? []).map((row) => row[column])
  } catch {
    return null
  }
}

// The signed-in user's rows of city_visits, city_plans or festival_plans (column festival_id) with their dates,
// newest first; null if loading failed
export async function fetchMyCityRows(table, column = 'city_id') {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from(table).select(`${column}, created_at`).order('created_at', { ascending: false })
    return error ? null : (data ?? [])
  } catch {
    return null
  }
}

export async function setCityFlag(table, cityId, on, column = 'city_id') {
  if (!supabase) return false
  try {
    const { error } = on
      ? await supabase.from(table).insert({ [column]: cityId })
      : await supabase.from(table).delete().eq(column, cityId)
    // Already liked or visited (duplicate key) is the state we wanted
    return !error || (on && error.code === '23505')
  } catch {
    return false
  }
}
