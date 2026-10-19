import { supabase } from './supabase.js'
import { avatarUrl } from './profileApi.js'

// Community posts and likes in Supabase (014_community_posts.sql). None of these throw: pages get a plain value back.

const saveFailed = "Couldn't save your post. Please try again."
const deleteFailed = "Couldn't delete your post. Please try again."

// Newest posts with like counts and the author's current name and photo; null if loading failed
export async function fetchFeed() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('community_feed')
    if (error) return null
    return (data ?? []).map((r) => ({
      ...r, likes: Number(r.likes ?? 0), liked: Boolean(r.liked), mine: Boolean(r.mine),
      author_avatar_url: avatarUrl(r.author_avatar),
    }))
  } catch {
    return null
  }
}

// row comes from postFromForm (communityPosts.js)
export async function createPost(row) {
  if (!supabase) return { error: saveFailed }
  try {
    const { error } = await supabase.from('community_posts').insert(row)
    return error ? { error: saveFailed } : { ok: true }
  } catch {
    return { error: saveFailed }
  }
}

// No row back means the post is gone (deleted in another tab), which is a failure too
export async function updatePost(id, { title, city_id, body }) {
  if (!supabase) return { error: saveFailed }
  try {
    const { data, error } = await supabase.from('community_posts').update({ title, city_id, body }).eq('id', id).select('id')
    return error || !data?.length ? { error: saveFailed } : { ok: true }
  } catch {
    return { error: saveFailed }
  }
}

export async function deletePost(id) {
  if (!supabase) return { error: deleteFailed }
  try {
    const { data, error } = await supabase.from('community_posts').delete().eq('id', id).select('id')
    return error || !data?.length ? { error: deleteFailed } : { ok: true }
  } catch {
    return { error: deleteFailed }
  }
}

// Like or unlike any post as the signed-in user; true if saved
export async function setPostLike(postId, on) {
  if (!supabase) return false
  try {
    const { error } = on
      ? await supabase.from('community_post_likes').insert({ post_id: postId })
      : await supabase.from('community_post_likes').delete().eq('post_id', postId)
    // Already liked (duplicate key) is the state we wanted
    return !error || (on && error.code === '23505')
  } catch {
    return false
  }
}
