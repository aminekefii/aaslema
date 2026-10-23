import { textLength } from './reviews.js'

// Edit profile form rules; 009_profiles.sql enforces the same limits.

export const PROFILE_LIMITS = { name: 80, place: 60, phoneMin: 6, phoneMax: 20, passwordMin: 8, bio: 300 }

// Public card travel style: [value saved, label shown]; 021_profile_card.sql allows the same values
export const TRAVEL_STYLES = [
  ['backpacker', 'Backpacker'],
  ['bikepacker', 'Bikepacker'],
  ['road-tripper', 'Road tripper'],
  ['culture', 'Culture & history'],
  ['beach', 'Beach & relax'],
]
export const travelStyleLabel = (value) => TRAVEL_STYLES.find(([v]) => v === value)?.[1] ?? null

// Suggestions for the Country field; any other text is allowed too
export const COUNTRIES = [
  'Tunisia', 'Algeria', 'Libya', 'Morocco', 'Egypt', 'France', 'Italy', 'Germany', 'Spain',
  'United Kingdom', 'United States', 'Canada', 'Belgium', 'Switzerland', 'Netherlands',
]

const PHONE = /^\+?[0-9 ()-]{6,20}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Database row → form values (inputs need strings, not null)
export const profileForm = (row) => ({
  full_name: row?.full_name ?? '',
  phone: row?.phone ?? '',
  city: row?.city ?? '',
  country: row?.country ?? '',
  bio: row?.bio ?? '',
  travel_style: row?.travel_style ?? '',
})

export function cleanProfile(form) {
  const name = form.full_name.trim()
  const phone = form.phone.trim().replace(/\s+/g, ' ')
  const city = form.city.trim()
  const country = form.country.trim()
  const bio = form.bio.trim()
  const style = form.travel_style

  if (!name) return { error: 'Please enter your name.' }
  if (textLength(name) > PROFILE_LIMITS.name) return { error: 'Name is too long (80 characters max).' }
  if (phone && (!PHONE.test(phone) || phone.replace(/\D/g, '').length < PROFILE_LIMITS.phoneMin)) {
    return { error: 'Please enter a valid phone number.' }
  }
  if (textLength(city) > PROFILE_LIMITS.place) return { error: 'City is too long (60 characters max).' }
  if (textLength(country) > PROFILE_LIMITS.place) return { error: 'Country is too long (60 characters max).' }
  if (textLength(bio) > PROFILE_LIMITS.bio) return { error: 'About you is too long (300 characters max).' }
  if (style && !travelStyleLabel(style)) return { error: 'Please choose a travel style from the list.' }

  return {
    values: {
      full_name: name, phone: phone || null, city: city || null, country: country || null,
      bio: bio || null, travel_style: style || null,
    },
  }
}

// Drives the Save button; an invalid form counts as changed so Save can show why
export function profileChanged(row, form) {
  const { values } = cleanProfile(form)
  if (!values) return true
  return Object.keys(values).some((key) => values[key] !== (row?.[key] ?? null))
}

export function emailError(current, next) {
  const email = next.trim()
  if (!email) return 'Please enter an email address.'
  if (!EMAIL.test(email)) return 'Please enter a valid email address.'
  if (email.toLowerCase() === (current ?? '').toLowerCase()) return "That's already your email."
  return null
}

export function passwordError(password, confirm) {
  if (password.length < PROFILE_LIMITS.passwordMin) return 'Password must be at least 8 characters.'
  if (password !== confirm) return "Passwords don't match."
  return null
}

export const avatarPath = (userId, id) => `${userId}/${id}.jpg`

// Email-change links come back to /app/profile with a message or an error in the hash
export function linkNotice(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const error = params.get('error_description')
  if (error) return { text: error, error: true }
  const message = params.get('message')
  return message ? { text: message } : null
}
