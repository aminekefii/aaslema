import { supabase } from './supabase.js'

// Approved reviews for the landing page; null if they couldn't be loaded. Never throws.
export async function fetchPublishedReviews() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('published_reviews')
    return error ? null : (data ?? [])
  } catch {
    return null
  }
}
