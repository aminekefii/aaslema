import { useEffect, useRef, useState } from 'react'
import {
  COUNTRIES, PASSWORD_HINT, PROFILE_LIMITS, TRAVEL_STYLES, cleanProfile, emailError, linkNotice, passwordError, profileChanged, profileForm,
} from '../profile.js'
import { ProfileCard } from '../components/ProfileCard.jsx'
import { avatarUrl, changeEmail, changePassword, fetchProfile, fetchProfileStats, removeAvatar, saveProfile, uploadAvatar } from '../profileApi.js'
import { textLength } from '../reviews.js'
import { initials } from '../names.js'

// Message under a card's button: { text, error? }
function Notice({ notice }) {
  if (!notice) return null
  return (
    <p className={`profile-note ${notice.error ? 'profile-note--error' : ''}`} role={notice.error ? 'alert' : 'status'}>
      {notice.text}
    </p>
  )
}

// What other travellers will see; follows the Personal details form as it is typed (form = its values)
function PublicCard({ profile, form, stats }) {
  return (
    <section className="profile-card">
      <h2>Your public card</h2>
      <p className="profile-card__lead">Other travellers will see this card. Your phone and email are never shown.</p>
      <ProfileCard
        name={form.full_name.trim() || profile.full_name}
        avatarUrl={avatarUrl(profile.avatar_path)}
        city={form.city.trim()}
        country={form.country.trim()}
        travelStyle={form.travel_style}
        bio={form.bio.trim()}
        stats={stats}
        emptyBio="Add a few words about yourself in Personal details."
      />
    </section>
  )
}

function PhotoCard({ user, profile, onSaved }) {
  const input = useRef(null)
  // 'upload' or 'remove' while saving
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const url = avatarUrl(profile.avatar_path)

  const run = async (kind, action) => {
    setBusy(kind)
    setNotice(null)
    const result = await action()
    setBusy(null)
    if (result.error) return setNotice({ text: result.error, error: true })
    onSaved(result.profile)
  }

  const pick = (e) => {
    const file = e.target.files?.[0]
    // Cleared so picking the same file again still uploads
    e.target.value = ''
    if (file) run('upload', () => uploadAvatar(user.id, file, profile.avatar_path))
  }

  return (
    <section className="profile-card">
      <h2>Profile photo</h2>
      <div className="profile-photo">
        {url
          ? <img src={url} alt="Your profile photo" className="profile-photo__img" />
          : <span className="profile-photo__initials" aria-hidden="true">{initials(profile.full_name)}</span>}
        <div className="profile-photo__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => input.current?.click()} disabled={busy !== null}>
            {busy === 'upload' ? 'Uploading…' : 'Change photo'}
          </button>
          {profile.avatar_path && (
            <button type="button" className="btn btn--sm admin-btn-outline" onClick={() => run('remove', () => removeAvatar(user.id, profile.avatar_path))} disabled={busy !== null}>
              {busy === 'remove' ? 'Removing…' : 'Remove photo'}
            </button>
          )}
          <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={pick} />
        </div>
      </div>
      <Notice notice={notice} />
    </section>
  )
}

// form / setForm live in the page so the public card can follow what is typed
function DetailsCard({ user, profile, onSaved, form, setForm }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setNotice(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    const { values, error } = cleanProfile(form)
    if (error) return setNotice({ text: error, error: true })
    setBusy(true)
    const result = await saveProfile(user.id, values)
    setBusy(false)
    if (result.error) return setNotice({ text: result.error, error: true })
    onSaved(result.profile)
    setNotice({ text: 'Saved.' })
  }

  return (
    <section className="profile-card">
      <h2>Personal details</h2>
      <form onSubmit={submit} noValidate>
        <fieldset className="auth-form" disabled={busy}>
          <label className="auth-field">
            Full name
            <input name="full_name" autoComplete="name" value={form.full_name} onChange={set('full_name')} />
          </label>
          <label className="auth-field">
            Phone
            <input type="tel" name="phone" autoComplete="tel" placeholder="+216 20 123 456" value={form.phone} onChange={set('phone')} />
          </label>
          <div className="profile-row">
            <label className="auth-field">
              City
              <input name="city" autoComplete="address-level2" value={form.city} onChange={set('city')} />
            </label>
            <label className="auth-field">
              Country
              <input name="country" autoComplete="country-name" list="profile-countries" value={form.country} onChange={set('country')} />
            </label>
          </div>
          <datalist id="profile-countries">
            {COUNTRIES.map((c) => <option key={c} value={c} />)}
          </datalist>
          <label className="auth-field">
            Travel style
            <select name="travel_style" value={form.travel_style} onChange={set('travel_style')}>
              <option value="">Not set</option>
              {TRAVEL_STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="auth-field">
            About you
            <textarea name="bio" rows={3} placeholder="Where you like to travel, what you're looking for…" value={form.bio} onChange={set('bio')} />
            <small>{textLength(form.bio.trim())} / {PROFILE_LIMITS.bio} characters, shown on your public card.</small>
          </label>
          <button type="submit" className="btn btn--primary profile-card__submit" disabled={!profileChanged(profile, form)}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}

function EmailCard({ user, initialNotice }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(initialNotice)

  const submit = async (e) => {
    e.preventDefault()
    const error = emailError(user.email, email)
    if (error) return setNotice({ text: error, error: true })
    setBusy(true)
    const result = await changeEmail(email.trim())
    setBusy(false)
    if (result.error) return setNotice({ text: result.error, error: true })
    setEmail('')
    setNotice({ text: 'We sent a confirmation link to both your old and new email. Your email changes once you open it.' })
  }

  return (
    <section className="profile-card">
      <h2>Email</h2>
      <p className="profile-card__lead">Current email: <strong>{user.email}</strong></p>
      {user.new_email && <p className="profile-card__lead">Waiting for you to confirm <strong>{user.new_email}</strong>.</p>}
      <form onSubmit={submit} noValidate>
        <fieldset className="auth-form" disabled={busy}>
          <label className="auth-field">
            New email
            <input type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setNotice(null) }} />
          </label>
          <button type="submit" className="btn btn--primary profile-card__submit">{busy ? 'Sending…' : 'Change email'}</button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}

function PasswordCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const error = passwordError(password, confirm)
    if (error) return setNotice({ text: error, error: true })
    setBusy(true)
    const result = await changePassword(password)
    setBusy(false)
    if (result.error) return setNotice({ text: result.error, error: true })
    setPassword('')
    setConfirm('')
    setNotice({ text: 'Password updated.' })
  }

  const field = (setter) => (e) => { setter(e.target.value); setNotice(null) }

  return (
    <section className="profile-card">
      <h2>Password</h2>
      <form onSubmit={submit} noValidate>
        <fieldset className="auth-form" disabled={busy}>
          <label className="auth-field">
            New password
            <input type="password" name="new-password" autoComplete="new-password" value={password} onChange={field(setPassword)} />
            <small>{PASSWORD_HINT}</small>
          </label>
          <label className="auth-field">
            Confirm password
            <input type="password" name="confirm-password" autoComplete="new-password" value={confirm} onChange={field(setConfirm)} />
          </label>
          <button type="submit" className="btn btn--primary profile-card__submit">{busy ? 'Updating…' : 'Update password'}</button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}

export default function EditProfile({ user }) {
  // undefined while loading, null if loading failed
  const [profile, setProfile] = useState(undefined)
  // Personal details form values (also shown live on the public card); undefined until the profile loads
  const [form, setForm] = useState(undefined)
  // Public card counts; null if they couldn't load
  const [stats, setStats] = useState(null)
  const userId = user.id
  // Read once: email-change links land here with a message or an error in the hash
  const [emailNotice] = useState(() => linkNotice(window.location.hash))

  useEffect(() => {
    document.title = 'Edit profile - Aaslema'
  }, [])

  // Drop the link's hash so a refresh doesn't show the message again
  useEffect(() => {
    if (emailNotice) window.history.replaceState(null, '', window.location.pathname)
  }, [emailNotice])

  useEffect(() => {
    let live = true
    fetchProfile(userId).then((result) => {
      if (!live) return
      setProfile(result.profile ?? null)
      if (result.profile) setForm(profileForm(result.profile))
    })
    fetchProfileStats().then((result) => {
      if (live) setStats(result)
    })
    return () => { live = false }
  }, [userId])

  // Saving details resets the form to what was saved; photo changes leave typed details alone
  const savedDetails = (saved) => {
    setProfile(saved)
    setForm(profileForm(saved))
  }

  return (
    <>
      <h1>Edit profile</h1>
      {profile === undefined && <p className="profile-note">Loading your profile…</p>}
      {profile === null && <p className="profile-note profile-note--error" role="alert">Couldn't load your profile. Please refresh the page.</p>}
      {profile && form && (
        <div className="profile-cards">
          <PublicCard profile={profile} form={form} stats={stats} />
          <PhotoCard user={user} profile={profile} onSaved={setProfile} />
          <DetailsCard user={user} profile={profile} onSaved={savedDetails} form={form} setForm={setForm} />
          <EmailCard user={user} initialNotice={emailNotice} />
          <PasswordCard />
        </div>
      )}
    </>
  )
}
