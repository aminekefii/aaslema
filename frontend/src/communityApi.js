import { supabase } from './supabase.js'
import { avatarUrl } from './profileApi.js'
import { IncompletePhotoError, incompletePhotoMessage, resizeToJpeg } from './imageResize.js'

// Community posts and likes in Supabase (014_community_posts.sql). None of these throw: pages get a plain value back.

const saveFailed = "Couldn't save your post. Please try again."
const deleteFailed = "Couldn't delete your post. Please try again."
const photoFailed = "Couldn't upload your photos. Please try again."

// Post photos: public bucket, one folder per user (023_post_photos_tags.sql)
const PHOTO_BUCKET = 'post-photos'
const PHOTO_MAX_BYTES = 2 * 1024 * 1024
export const postPhotoUrl = (path) => supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
// photos and tags come from 023; before it is run, posts load and save without them
const missingColumn = (error) => error?.code === '42703' || error?.code === 'PGRST204'
const withMedia = (r) => ({ ...r, photos: r.photos ?? [], photo_urls: (r.photos ?? []).map(postPhotoUrl), tags: r.tags ?? [] })

// Best effort: a file left behind only costs storage
export const removePostPhotos = (paths) =>
  paths.length ? supabase.storage.from(PHOTO_BUCKET).remove(paths).catch(() => {}) : Promise.resolve()

// Shrinks and uploads the chosen files; { paths } or { error } (nothing is left behind on failure)
async function uploadPostPhotos(userId, files) {
  const paths = []
  for (const file of files) {
    let blob
    try {
      blob = await resizeToJpeg(file)
      if (blob.size > PHOTO_MAX_BYTES) blob = await resizeToJpeg(file, 1600, 0.7)
    } catch (error) {
      await removePostPhotos(paths)
      return { error: error instanceof IncompletePhotoError ? incompletePhotoMessage : `Couldn't read the photo "${file.name}". Try another one.` }
    }
    const path = `${userId}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      await removePostPhotos(paths)
      return { error: photoFailed }
    }
    paths.push(path)
  }
  return { paths }
}

// Newest posts with like counts and the author's current name and photo; null if loading failed
export async function fetchFeed() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('community_feed')
    if (error) return null
    return (data ?? []).map((r) => withMedia({
      ...r, likes: Number(r.likes ?? 0), liked: Boolean(r.liked), mine: Boolean(r.mine), comments: Number(r.comments ?? 0),
      author_avatar_url: avatarUrl(r.author_avatar),
    }))
  } catch {
    return null
  }
}

// row comes from postFromForm (communityPosts.js); files are new photos to upload (up to 3)
export async function createPost(row, { userId, files = [] } = {}) {
  if (!supabase) return { error: saveFailed }
  const upload = files.length ? await uploadPostPhotos(userId, files) : { paths: [] }
  if (upload.error) return { error: upload.error }
  try {
    let { error } = await supabase.from('community_posts').insert({ ...row, photos: upload.paths })
    // Before 023: a post without photos or hashtags can still be saved
    if (missingColumn(error) && !upload.paths.length && !row.tags.length) {
      const { tags, ...plain } = row
      ;({ error } = await supabase.from('community_posts').insert(plain))
    }
    if (error) await removePostPhotos(upload.paths)
    return error ? { error: saveFailed } : { ok: true }
  } catch {
    await removePostPhotos(upload.paths)
    return { error: saveFailed }
  }
}

// photos (when given): { userId, keep: saved paths to keep, files: new photos, removed: saved paths dropped }.
// No row back means the post is gone (deleted in another tab), which is a failure too.
export async function updatePost(id, { title, city_id, body, tags }, photos = null) {
  if (!supabase) return { error: saveFailed }
  const upload = photos?.files.length ? await uploadPostPhotos(photos.userId, photos.files) : { paths: [] }
  if (upload.error) return { error: upload.error }
  const values = { title, city_id, body, tags, ...(photos && { photos: [...photos.keep, ...upload.paths] }) }
  try {
    const save = (v) => supabase.from('community_posts').update(v).eq('id', id).select('id')
    let { data, error } = await save(values)
    if (missingColumn(error) && !upload.paths.length && !tags.length && !photos?.keep.length) {
      ;({ data, error } = await save({ title, city_id, body }))
    }
    if (error || !data?.length) {
      await removePostPhotos(upload.paths)
      return { error: saveFailed }
    }
    if (photos) await removePostPhotos(photos.removed)
    return { ok: true }
  } catch {
    await removePostPhotos(upload.paths)
    return { error: saveFailed }
  }
}

// photos: the post's saved photo paths, removed once the post is gone
export async function deletePost(id, photos = []) {
  if (!supabase) return { error: deleteFailed }
  try {
    const { data, error } = await supabase.from('community_posts').delete().eq('id', id).select('id')
    if (error || !data?.length) return { error: deleteFailed }
    await removePostPhotos(photos)
    return { ok: true }
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
    return error ? null : (data ?? []).map(withMedia)
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
