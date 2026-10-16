import { useEffect, useState } from 'react'
import { COUNTRIES, cleanProfile, profileChanged, profileForm } from '../profile.js'
import { fetchProfile, saveProfile } from '../profileApi.js'

// Message under a card's button: { text, error? }
function Notice({ notice }) {
  if (!notice) return null
  return (
    <p className={`profile-note ${notice.error ? 'profile-note--error' : ''}`} role={notice.error ? 'alert' : 'status'}>
      {notice.text}
    </p>
  )
}

function DetailsCard({ user, profile, onSaved }) {
  const [form, setForm] = useState(() => profileForm(profile))
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
    setForm(profileForm(result.profile))
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
          <button type="submit" className="btn btn--primary profile-card__submit" disabled={!profileChanged(profile, form)}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </fieldset>
      </form>
      <Notice notice={notice} />
    </section>
  )
}

export default function EditProfile({ user }) {
  // undefined while loading, null if loading failed
  const [profile, setProfile] = useState(undefined)
  const userId = user.id

  useEffect(() => {
    document.title = 'Edit profile - Aaslema'
  }, [])

  useEffect(() => {
    let live = true
    fetchProfile(userId).then((result) => {
      if (live) setProfile(result.profile ?? null)
    })
    return () => { live = false }
  }, [userId])

  return (
    <>
      <h1>Edit profile</h1>
      {profile === undefined && <p className="profile-note">Loading your profile…</p>}
      {profile === null && <p className="profile-note profile-note--error" role="alert">Couldn't load your profile. Please refresh the page.</p>}
      {profile && (
        <div className="profile-cards">
          <DetailsCard user={user} profile={profile} onSaved={setProfile} />
        </div>
      )}
    </>
  )
}
