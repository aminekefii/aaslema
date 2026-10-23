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
      ...r, likes: Number(r.likes ?? 0), liked: Boolean(r.liked), mine: Boolean(r.mine), comments: Number(r.comments ?? 0),
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

// The signed-in user's own posts with like counts (015_my_posts.sql); null if loading failed
export async function fetchMyPosts() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('my_posts')
    return error ? null : data ?? []
  } catch {
    return null
  }
}

const commentFailed = "Couldn't post your comment. Please try again."
const commentDeleteFailed = "Couldn't delete your comment. Please try again."

// One post's comments, oldest first, with the author's current name and photo (019_post_comments.sql); null if loading failed
export async function fetchComments(postId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('post_comments', { p_post_id: postId })
    if (error) return null
    return (data ?? []).map((r) => ({ ...r, mine: Boolean(r.mine), author_avatar_url: avatarUrl(r.author_avatar) }))
  } catch {
    return null
  }
}

// row comes from commentFromForm (communityPosts.js)
export async function createComment(postId, row) {
  if (!supabase) return { error: commentFailed }
  try {
    const { error } = await supabase.from('community_post_comments').insert({ post_id: postId, ...row })
    return error ? { error: commentFailed } : { ok: true }
  } catch {
    return { error: commentFailed }
  }
}

// No row back means the comment is already gone, which is a failure too
export async function deleteComment(id) {
  if (!supabase) return { error: commentDeleteFailed }
  try {
    const { data, error } = await supabase.from('community_post_comments').delete().eq('id', id).select('id')
    return error || !data?.length ? { error: commentDeleteFailed } : { ok: true }
  } catch {
    return { error: commentDeleteFailed }
  }
}

const reportFailed = "Couldn't send your report. Please try again."

// Report someone else's post (016_post_reports.sql); row comes from reportFromForm
export async function reportPost(postId, row) {
  if (!supabase) return { error: reportFailed }
  try {
    const { error } = await supabase.from('post_reports').insert({ post_id: postId, reason: row.reason })
    if (!error) return { ok: true }
    return { error: error.code === '23505' ? 'You already reported this post.' : reportFailed }
  } catch {
    return { error: reportFailed }
  }
}

// Admins: every report with the reporter's name and the post's title; { error } carries the code (42501 = no admin rights)
export async function fetchPostReports() {
  if (!supabase) return { error: {} }
  try {
    const { data, error } = await supabase.rpc('admin_post_reports')
    return error ? { error } : { reports: data ?? [] }
  } catch (e) {
    return { error: { message: e.message } }
  }
}
