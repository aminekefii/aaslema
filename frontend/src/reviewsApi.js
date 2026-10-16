import { supabase } from './supabase.js'
import { avatarUrl } from './profileApi.js'

// Approved reviews for the landing page; null if they couldn't be loaded. Never throws.
export async function fetchPublishedReviews() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('published_reviews')
    if (error) return null
    // author_avatar is the author's profile photo path (010_author_photos.sql)
    return (data ?? []).map((r) => ({ ...r, author_avatar_url: avatarUrl(r.author_avatar) }))
  } catch {
    return null
  }
}
