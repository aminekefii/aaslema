import { supabase } from './supabase.js'
import { resizeToJpeg } from './imageResize.js'
import { avatarUrl } from './profileApi.js'
import { momentPath } from './moments.js'

// Destination moments in Supabase. None of these throw: pages get a plain value back.

const BUCKET = 'moments'
const MAX_BYTES = 2 * 1024 * 1024
const uploadFailed = "Couldn't upload your moment. Please try again."

// Photos are private; storage rules decide which links can be made (approved, own, or admin)
export async function photoUrls(paths) {
  if (!supabase || paths.length === 0) return {}
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
    if (error) return {}
    const urls = {}
    for (const item of data ?? []) if (item.signedUrl && !item.error) urls[item.path] = item.signedUrl
    return urls
  } catch {
    return {}
  }
}

// Approved moments of a destination with photo links; null if loading failed
export async function fetchPublishedMoments(cityId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('published_moments', { p_city_id: cityId })
    if (error) return null
    const rows = data ?? []
    const urls = await photoUrls(rows.map((r) => r.image_path))
    // likes / liked / mine come from 008_moment_likes.sql, author_avatar from 010_author_photos.sql
    return rows
      .filter((r) => urls[r.image_path])
      .map((r) => ({
        ...r, url: urls[r.image_path], likes: Number(r.likes ?? 0), liked: Boolean(r.liked), mine: Boolean(r.mine),
        author_avatar_url: avatarUrl(r.author_avatar),
      }))
  } catch {
    return null
  }
}

// Newest approved moments from every destination for the Feed (017_feed_moments.sql); null if loading failed
export async function fetchFeedMoments() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('feed_moments')
    if (error) return null
    const rows = data ?? []
    const urls = await photoUrls(rows.map((r) => r.image_path))
    return rows
      .filter((r) => urls[r.image_path])
      .map((r) => ({ ...r, url: urls[r.image_path], author_avatar_url: avatarUrl(r.author_avatar) }))
  } catch {
    return null
  }
}

// The signed-in user's moments, pending ones too, with photo links; null if loading failed
export async function fetchMyMoments() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('my_moments')
    if (error) return null
    const rows = data ?? []
    // Uploaders can read their own photos (011_my_moments.sql); a missing link shows "Photo unavailable"
    const urls = await photoUrls(rows.map((r) => r.image_path))
    return rows.map((r) => ({ ...r, url: urls[r.image_path] }))
  } catch {
    return null
  }
}

// Like or unlike someone else's approved moment as the signed-in user; true if saved
export async function setMomentLike(momentId, on) {
  if (!supabase) return false
  try {
    const { error } = on
      ? await supabase.from('moment_likes').insert({ moment_id: momentId })
      : await supabase.from('moment_likes').delete().eq('moment_id', momentId)
    // Already liked (duplicate key) is the state we wanted
    return !error || (on && error.code === '23505')
  } catch {
    return false
  }
}

export async function uploadMoment(file, row, userId) {
  if (!supabase) return { error: uploadFailed }
  let blob
  try {
    blob = await resizeToJpeg(file)
    if (blob.size > MAX_BYTES) blob = await resizeToJpeg(file, 1600, 0.7)
  } catch {
    // e.g. HEIC photos in browsers that can't decode them
    return { error: "Couldn't read this photo. Try another one." }
  }
  if (blob.size > MAX_BYTES) return { error: 'This photo is too large. Try a smaller one.' }

  const path = momentPath(userId, crypto.randomUUID())
  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) return { error: uploadFailed }
    const { error } = await supabase.from('moments').insert({ ...row, image_path: path })
    if (error) {
      // No moment points at the photo, so remove it (uploaders may delete unused photos)
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
      return { error: uploadFailed }
    }
    return { ok: true }
  } catch {
    return { error: uploadFailed }
  }
}
