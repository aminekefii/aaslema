import { useCallback, useState } from 'react'
import { Compass, MapPin } from 'lucide-react'
import Modal from './Modal.jsx'
import { initials } from '../names.js'
import { travelStyleLabel } from '../profile.js'
import { fetchPublicCard } from '../profileApi.js'

// A traveller's public card: photo over a dark band, name, place, travel style, bio and counts.
// Never phone or email. emptyBio is shown when there is no bio (null shows nothing).
export function ProfileCard({ name, avatarUrl, city, country, travelStyle, bio, stats, emptyBio = null }) {
  const place = [city, country].filter(Boolean).join(', ')
  const style = travelStyleLabel(travelStyle)
  const count = (key) => (stats ? stats[key] : '–')

  return (
    <article className="public-card" aria-label={`${name}'s profile card`}>
      <div className="public-card__band" />
      <div className="public-card__body">
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="public-card__photo" />
          : <span className="public-card__photo public-card__photo--initials" aria-hidden="true">{initials(name)}</span>}
        <h3>{name}</h3>
        {place && <p className="public-card__place"><MapPin size={14} /> {place}</p>}
        {style && <p className="public-card__style"><Compass size={14} /> {style}</p>}
        {bio
          ? <p className="public-card__bio">{bio}</p>
          : emptyBio && <p className="public-card__bio public-card__bio--empty">{emptyBio}</p>}
        <dl className="public-card__stats">
          <div><dt>Destinations visited</dt><dd>{count('visited')}</dd></div>
          <div><dt>Moments shared</dt><dd>{count('moments')}</dd></div>
          <div><dt>Posts</dt><dd>{count('posts')}</dd></div>
        </dl>
      </div>
    </article>
  )
}

// The author's photo and name on a post, moment or comment. With onOpen (signed-in users) it is a
// button that opens their card; otherwise it is shown as it is.
export function AuthorButton({ name, onOpen, className = '', children }) {
  if (!onOpen) return <div className={className}>{children}</div>
  return (
    <button type="button" className={`author-btn ${className}`} onClick={onOpen} aria-label={`See ${name}'s profile card`}>
      {children}
    </button>
  )
}

// Opens someone's card in a dialog. openCard(kind, id, name) is null for visitors, so authors
// stay plain for them. Render `cardDialog` once on the page.
export function useProfileCard(user) {
  // { kind, id, name, card?, error? }
  const [open, setOpen] = useState(null)

  const show = useCallback(async (kind, id, name) => {
    setOpen({ kind, id, name })
    const result = await fetchPublicCard(kind, id)
    // Ignore a late answer for a card that was closed or replaced
    setOpen((now) => (now?.kind === kind && now.id === id ? { ...now, ...result } : now))
  }, [])

  const close = useCallback(() => setOpen(null), [])

  const cardDialog = open && (
    <Modal title={`${open.name}'s profile`} labelId="profile-card-title" onClose={close}>
      {!open.card && !open.error && <p className="profile-note">Loading…</p>}
      {open.error && <p className="profile-note profile-note--error" role="alert">Couldn't load this profile. Please try again.</p>}
      {open.card && (
        <ProfileCard
          name={open.card.full_name}
          avatarUrl={open.card.avatar_url}
          city={open.card.city}
          country={open.card.country}
          travelStyle={open.card.travel_style}
          bio={open.card.bio}
          stats={open.card.stats}
        />
      )}
    </Modal>
  )

  return { openCard: user ? show : null, cardDialog }
}
