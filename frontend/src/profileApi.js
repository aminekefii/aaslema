import { supabase } from './supabase.js'
import { IncompletePhotoError, incompletePhotoMessage, resizeToSquareJpeg } from './imageResize.js'
import { avatarPath } from './profile.js'

// Profile row, photo and account changes in Supabase. None of these throw: pages get a plain value back.

const BUCKET = 'avatars'
const BASE_COLUMNS = 'id, full_name, phone, city, country, avatar_path'
// bio and travel_style come from 021_profile_card.sql; until it is run, profiles load and save without them
const COLUMNS = `${BASE_COLUMNS}, bio, travel_style`
const missingColumn = (error) => error?.code === '42703' || error?.code === 'PGRST204'
const withoutCardFields = ({ bio, travel_style, ...values }) => values
const saveFailed = "Couldn't save your changes. Please try again."
const photoFailed = "Couldn't save your photo. Please try again."
const accountFailed = "Couldn't update your account. Please try again."

// Photos are public; the random file name changes with every upload, so caches never show an old one
export function avatarUrl(path) {
  if (!supabase || !path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// A trigger copies name and photo into the account; a fresh session brings them to the navbar
const refreshSession = () => supabase.auth.refreshSession().catch(() => {})

const updateRow = async (userId, values) => {
  const update = (row, columns) => supabase.from('profiles').update(row).eq('id', userId).select(columns).maybeSingle()
  let { data, error } = await update(values, COLUMNS)
  if (missingColumn(error)) ({ data, error } = await update(withoutCardFields(values), BASE_COLUMNS))
  return error || !data ? null : data
}

const removeFile = (path) => supabase.storage.from(BUCKET).remove([path]).catch(() => {})

export async function fetchProfile(userId) {
  if (!supabase) return { error: true }
  try {
    const select = (columns) => supabase.from('profiles').select(columns).eq('id', userId).maybeSingle()
    let { data, error } = await select(COLUMNS)
    if (missingColumn(error)) ({ data, error } = await select(BASE_COLUMNS))
    return error || !data ? { error: true } : { profile: data }
  } catch {
    return { error: true }
  }
}

export async function saveProfile(userId, values) {
  if (!supabase) return { error: saveFailed }
  try {
    const profile = await updateRow(userId, values)
    if (!profile) return { error: saveFailed }
    await refreshSession()
    return { profile }
  } catch {
    return { error: saveFailed }
  }
}

export async function uploadAvatar(userId, file, oldPath) {
  if (!supabase) return { error: photoFailed }
  let blob
  try {
    blob = await resizeToSquareJpeg(file)
  } catch (error) {
    if (error instanceof IncompletePhotoError) return { error: incompletePhotoMessage }
    // Not an image, a damaged file, or HEIC the browser can't convert
    return { error: "Couldn't read that photo." }
  }

  const path = avatarPath(userId, crypto.randomUUID())
  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) return { error: photoFailed }
    const profile = await updateRow(userId, { avatar_path: path })
    if (!profile) {
      await removeFile(path)
      return { error: photoFailed }
    }
    if (oldPath) await removeFile(oldPath)
    await refreshSession()
    return { profile }
  } catch {
    return { error: photoFailed }
  }
}

export async function removeAvatar(userId, oldPath) {
  if (!supabase) return { error: photoFailed }
  try {
    const profile = await updateRow(userId, { avatar_path: null })
    if (!profile) return { error: photoFailed }
    if (oldPath) await removeFile(oldPath)
    await refreshSession()
    return { profile }
  } catch {
    return { error: photoFailed }
  }
}

// Public card counts (021_profile_card.sql): destinations visited, approved moments, posts; null if loading failed
export async function fetchProfileStats() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('my_profile_stats')
    const row = data?.[0]
    if (error || !row) return null
    return { visited: Number(row.visited ?? 0), moments: Number(row.moments ?? 0), posts: Number(row.posts ?? 0) }
  } catch {
    return null
  }
}

// Supabase's own messages explain rate limits and "same password", so they are shown as they are
export async function changeEmail(email) {
  if (!supabase) return { error: accountFailed }
  try {
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/app/profile/edit` })
    return error ? { error: error.message } : { ok: true }
  } catch {
    return { error: accountFailed }
  }
}

export async function changePassword(password) {
  if (!supabase) return { error: accountFailed }
  try {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { error: error.message } : { ok: true }
  } catch {
    return { error: accountFailed }
  }
}
