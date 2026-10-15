import { useEffect, useState } from 'react'
import {
  Heart, MapPin, ArrowLeft, Utensils, History, Sparkles, Calendar, Share2,
  Navigation, Star, CheckCircle2, Map as MapIcon, Camera, Facebook, Twitter,
} from 'lucide-react'
import { cities } from '../cities.js'
import Modal from '../components/Modal.jsx'
import { base } from '../route.js'
import { adjustCount, likeCount } from '../cityCounts.js'
import { fetchLikeCounts, fetchMyCityIds, setCityFlag } from '../cityActivity.js'
import MomentsCarousel from '../components/MomentsCarousel.jsx'
import { CAPTION_MAX, momentFromForm, spotMoments } from '../moments.js'
import { fetchPublishedMoments, uploadMoment } from '../momentsApi.js'
import { textLength } from '../reviews.js'

// Port of aaslema-new's CityDetail page. Likes, visits (cityActivity.js) and moments
// (momentsApi.js) live in Supabase; the plan still lives in the viewer's browser.
const readList = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
const writeList = (key, list) => {
  try { localStorage.setItem(key, JSON.stringify(list)); return true } catch { return false }
}
const toggleIn = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

const ACHIEVEMENTS = [
  { id: 'first_visit', title: 'First Contact', icon: '📍', desc: 'Arrived at the governorate.' },
  { id: 'local_eats', title: 'Flavour Hunter', icon: '🥘', desc: 'Tried a local delicacy.' },
  { id: 'hidden_path', title: 'Pathfinder', icon: '🧭', desc: 'Discovered a hidden gem.' },
]

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'moments', label: 'Moments' },
]

const EMPTY_MOMENT = { file: null, preview: '', spot: '', caption: '' }

export default function CityDetail({ id, user }) {
  const city = cities.find((c) => c.id === id)
  const [hasLiked, setHasLiked] = useState(false)
  // Visitors can't plan, so a plan left in their browser from before isn't shown
  const [isInPlan, setIsInPlan] = useState(() => Boolean(user && city && readList('planned_cities').includes(city.name)))
  const [isVisited, setIsVisited] = useState(false)
  // Like counts for everyone; null until loaded (or if loading failed)
  const [counts, setCounts] = useState(null)
  const [likeBusy, setLikeBusy] = useState(false)
  const [visitBusy, setVisitBusy] = useState(false)
  // Whether this user's own likes and visits have loaded; buttons wait for it
  const [mineLoaded, setMineLoaded] = useState(false)
  // null, 'signin' or 'error' — shown under the buttons
  const [note, setNote] = useState(null)
  const userId = user?.id
  const [activeTab, setActiveTab] = useState('overview')
  // Approved moments: undefined while loading, [] if none (or loading failed)
  const [moments, setMoments] = useState(undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [newMoment, setNewMoment] = useState(EMPTY_MOMENT)
  // Preview the browser can't show (e.g. HEIC in Chrome); the photo still uploads
  const [brokenPreview, setBrokenPreview] = useState('')
  // null, 'uploading' or { error } — shown in the upload popup
  const [uploadStatus, setUploadStatus] = useState(null)
  const [showUnderReview, setShowUnderReview] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = `${city ? city.name : 'City not found'} - Aaslema`
  }, [city])

  useEffect(() => {
    fetchLikeCounts().then(setCounts)
  }, [id])

  // Likes and visits belong to one user: reset when the user changes and ignore late answers
  useEffect(() => {
    setHasLiked(false)
    setIsVisited(false)
    setMineLoaded(!userId)
    if (!userId) return
    let current = true
    Promise.all([fetchMyCityIds('city_likes'), fetchMyCityIds('city_visits')]).then(([liked, visited]) => {
      if (!current) return
      if (!liked || !visited) return setNote('loadError')
      setHasLiked(liked.includes(id))
      setIsVisited(visited.includes(id))
      setMineLoaded(true)
    })
    return () => { current = false }
  }, [id, userId])

  useEffect(() => {
    let current = true
    setMoments(undefined)
    fetchPublishedMoments(id).then((rows) => { if (current) setMoments(rows ?? []) })
    return () => { current = false }
  }, [id])

  // Free the photo preview when it's replaced or the popup closes
  useEffect(() => () => { if (newMoment.preview) URL.revokeObjectURL(newMoment.preview) }, [newMoment.preview])

  if (!city) {
    return (
      <section className="page-banner city-missing">
        <div className="container">
          <MapPin size={40} />
          <h1>City not found</h1>
          <p>We couldn't find the governorate you're looking for.</p>
          <a href={`${base}/destinations`} className="btn btn--primary">Browse other cities</a>
        </div>
      </section>
    )
  }

  // Flip right away, save, and flip back if saving fails
  const toggleFlag = async (table, isOn, setOn, setBusy, countsLikes) => {
    if (!user) return setNote('signin')
    setNote(null)
    setBusy(true)
    setOn(!isOn)
    if (countsLikes) setCounts((c) => c && adjustCount(c, city.id, isOn ? -1 : 1))
    const saved = await setCityFlag(table, city.id, !isOn)
    if (!saved) {
      setOn(isOn)
      if (countsLikes) setCounts((c) => c && adjustCount(c, city.id, isOn ? 1 : -1))
      setNote('error')
    }
    // The server's count wins over the optimistic one (it also fills in counts that never loaded)
    if (saved && countsLikes) fetchLikeCounts().then((fresh) => { if (fresh) setCounts(fresh) })
    setBusy(false)
  }
  const handleLike = () => toggleFlag('city_likes', hasLiked, setHasLiked, setLikeBusy, true)
  const handleToggleVisited = () => toggleFlag('city_visits', isVisited, setIsVisited, setVisitBusy, false)
  const handleAddToPlan = () => {
    if (!user) return setNote('signin')
    setNote(null)
    writeList('planned_cities', toggleIn(readList('planned_cities'), city.name))
    setIsInPlan(!isInPlan)
  }

  const openUpload = () => {
    setNewMoment(EMPTY_MOMENT)
    setUploadStatus(null)
    setIsUploading(true)
  }
  const closeUpload = () => {
    setIsUploading(false)
    setNewMoment(EMPTY_MOMENT)
  }
  const handleFinishUpload = async (e) => {
    e.preventDefault()
    const result = momentFromForm(newMoment, user, city)
    if (result.error) return setUploadStatus({ error: result.error })
    setUploadStatus('uploading')
    const saved = await uploadMoment(newMoment.file, result.row, user.id)
    if (saved.error) return setUploadStatus({ error: saved.error })
    setUploadStatus(null)
    closeUpload()
    setShowUnderReview(true)
  }

  const share = (url) => {
    window.open(url, '_blank', 'noopener')
    setShowShareModal(false)
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => { setCopied(false); setShowShareModal(false) }, 1200)
    } catch {
      setShowShareModal(false)
    }
  }
  const pageUrl = encodeURIComponent(window.location.href)

  return (
    <>
      {/* Header */}
      <section className="city-hero">
        <div className="container">
          <a href={`${base}/destinations`} className="city-hero__back"><ArrowLeft size={16} /> Back to destinations</a>

          <div className="city-hero__grid">
            <div>
              <h1>{city.name}</h1>
              <p className="city-hero__title">{city.title}</p>

              <dl className="city-facts">
                <div><Sparkles size={16} /><div><dt>Vibe</dt><dd>{city.vibe}</dd></div></div>
                <div><Calendar size={16} /><div><dt>Best time</dt><dd>{city.bestTime}</dd></div></div>
                <div><MapPin size={16} /><div><dt>Population</dt><dd>{city.population}</dd></div></div>
              </dl>

              <div className="city-actions">
                <button onClick={handleLike} disabled={likeBusy || !mineLoaded} aria-pressed={hasLiked} className={`city-btn ${hasLiked ? 'city-btn--primary' : ''}`}>
                  <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
                  {hasLiked ? 'Liked' : 'Like'}{counts && ` · ${likeCount(counts, city.id)}`}
                </button>
                <button onClick={handleAddToPlan} aria-pressed={isInPlan} className={`city-btn ${isInPlan ? 'city-btn--soft' : ''}`}>
                  {isInPlan ? <CheckCircle2 size={16} /> : <Calendar size={16} />}
                  {isInPlan ? 'In your plan' : 'Add to plan'}
                </button>
                <button onClick={handleToggleVisited} disabled={visitBusy || !mineLoaded} aria-pressed={isVisited} className={`city-btn ${isVisited ? 'city-btn--soft' : ''}`}>
                  {isVisited ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
                  {isVisited ? 'Visited' : 'Mark as visited'}
                </button>
                <button onClick={() => setShowShareModal(true)} className="city-btn city-btn--ghost" aria-label={`Share ${city.name}`}>
                  <Share2 size={16} /> Share
                </button>
              </div>
              {note === 'signin' && (
                <p className="city-note">Sign in to like, plan and track your visits. <a href="/signin">Sign in</a></p>
              )}
              {note === 'error' && <p className="city-note city-note--error" role="alert">Couldn't save that. Please try again.</p>}
              {note === 'loadError' && <p className="city-note city-note--error" role="alert">Couldn't load your likes and visits. Please refresh the page.</p>}
            </div>

            <div className="city-hero__media">
              <img src={city.image} alt={city.name} className="city-hero__image" />
              {isVisited && <span className="city-hero__visited"><CheckCircle2 size={18} /> Visited</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="section city-body">
        <div className="container">
          {/* Tabs */}
          <div className="city-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'active' : ''}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div key="overview" className="city-panel city-overview">
              <div className="city-overview__main">
                <section>
                  <div className="city-heading"><History size={20} /><h2>History</h2></div>
                  <p className="city-prose">{city.sections.history}</p>
                </section>

                {city.gallery.length > 0 && (
                  <section>
                    <h2 className="city-h2">Gallery</h2>
                    <div className="city-gallery">
                      {city.gallery.map((img) => (
                        <div key={img} className="city-gallery__item">
                          <img src={img} alt={`${city.name} view`} loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="city-heading"><Utensils size={20} /><h2>Where to eat</h2></div>
                  <ul className="city-list">
                    {city.sections.restaurants.map((rest) => <li key={rest}>{rest}</li>)}
                  </ul>
                </section>
              </div>

              <aside className="city-sidebar">
                <div className="cd-card">
                  <div className="cd-card__head"><Calendar size={16} /><h3>Events</h3></div>
                  <ul className="city-events">
                    {city.sections.events.map((event) => <li key={event}>{event}</li>)}
                  </ul>
                </div>

                <div className="cd-card">
                  <div className="cd-card__head"><Star size={16} /><h3>Achievements</h3></div>
                  <ul className="city-badges">
                    {ACHIEVEMENTS.map((badge) => (
                      <li key={badge.id}>
                        <span aria-hidden="true">{badge.icon}</span>
                        <div>
                          <strong>{badge.title}</strong>
                          <small>{badge.desc}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'highlights' && (
            <div key="highlights" className="city-panel city-stack">
              <section>
                <h2 className="city-h2">Highlights</h2>
                <div className="city-highlights">
                  {city.highlights.map((h) => {
                    const shots = spotMoments(moments ?? [], h)
                    return (
                      <div key={h} className="cd-card city-highlight">
                        <div className="city-highlight__top">
                          <span className="city-highlight__icon"><Navigation size={18} /></span>
                        </div>
                        <h3>{h}</h3>
                        <p>A key stop on the {city.name} trail.</p>
                        {shots.length > 0 && (
                          <div className="city-highlight__moments">
                            <div className="city-highlight__thumbs">
                              {shots.slice(0, 3).map((m) => <img key={m.id} src={m.url} alt="" />)}
                            </div>
                            <span>{shots.length} {shots.length === 1 ? 'moment' : 'moments'}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              <section>
                <h2 className="city-h2">Hidden gems</h2>
                <p className="city-sub">Spots most visitors miss.</p>
                <ul className="city-list city-list--dots">
                  {city.sections.gems.map((gem) => <li key={gem}>{gem}</li>)}
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'moments' && (
            <div key="moments" className="city-panel city-stack">
              <div className="city-moments__head">
                <div>
                  <h2 className="city-h2">Moments</h2>
                  <p className="city-sub">Photos travellers shared from {city.name}.</p>
                </div>
                {user
                  ? <button onClick={() => openUpload()} className="btn btn--primary"><Camera size={16} /> Add moment</button>
                  : <a href="/signin" className="city-moments__signin">Sign in to your account to upload your moments</a>}
              </div>

              {moments === undefined ? (
                <p className="city-sub">Loading moments…</p>
              ) : moments.length === 0 ? (
                <div className="cd-card city-empty">
                  <MapIcon size={32} />
                  <p>No moments yet. Add the first photo from {city.name}.</p>
                </div>
              ) : (
                <MomentsCarousel moments={moments} />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Moment upload modal */}
      {isUploading && (
        <Modal title="Add a moment" labelId="moment-dialog-title" onClose={uploadStatus === 'uploading' ? () => {} : closeUpload} wide>
          <p className="modal__sub">Share a photo from your trip to {city.name}.</p>
          <form onSubmit={handleFinishUpload} className="moment-form" noValidate>
            <fieldset className="contact__fieldset" disabled={uploadStatus === 'uploading'}>
              {newMoment.preview ? (
                <div className="moment-form__preview">
                  {brokenPreview === newMoment.preview ? (
                    <div className="moment-form__no-preview">
                      <Camera size={28} />
                      <span>{newMoment.file.name}</span>
                      <small>No preview, but the photo will upload</small>
                    </div>
                  ) : (
                    <img src={newMoment.preview} alt="Preview" onError={() => setBrokenPreview(newMoment.preview)} />
                  )}
                  <button type="button" onClick={() => setNewMoment({ ...newMoment, file: null, preview: '' })}>Change photo</button>
                </div>
              ) : (
                <label className="moment-form__drop">
                  <Camera size={28} />
                  <span>Choose a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setNewMoment((m) => ({ ...m, file, preview: URL.createObjectURL(file) }))
                    }}
                  />
                </label>
              )}

              <label>
                Highlight
                <select value={newMoment.spot} onChange={(e) => setNewMoment({ ...newMoment, spot: e.target.value })}>
                  <option value="">General area</option>
                  {city.highlights.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>

              <label>
                Caption
                <textarea
                  rows={3}
                  placeholder="What made this spot special?"
                  value={newMoment.caption}
                  onChange={(e) => setNewMoment({ ...newMoment, caption: e.target.value })}
                />
                <span className="moment-form__count">{textLength(newMoment.caption.trim())} / {CAPTION_MAX}</span>
              </label>

              <button type="submit" className="btn btn--primary">
                {uploadStatus === 'uploading' ? 'Uploading…' : 'Share moment'}
              </button>
            </fieldset>
            {uploadStatus?.error && <p className="contact__error" role="alert">{uploadStatus.error}</p>}
          </form>
        </Modal>
      )}

      {/* Shown after a successful upload */}
      {showUnderReview && (
        <Modal title="Thanks for sharing!" labelId="moment-review-title" onClose={() => setShowUnderReview(false)}>
          <p className="modal__sub">Your moment is under review and will appear here once an admin approves it.</p>
          <button type="button" className="btn btn--primary moment-review__close" onClick={() => setShowUnderReview(false)}>Close</button>
        </Modal>
      )}

      {/* Share modal */}
      {showShareModal && (
        <Modal title={`Share ${city.name}`} labelId="share-dialog-title" onClose={() => setShowShareModal(false)}>
          {/* Sharing isn't live yet: the buttons stay hidden underneath so the card keeps its size */}
          <div className="share-options share-options--soon">
            <p className="share-options__soon">Coming soon</p>
            <fieldset className="share-options__buttons" disabled aria-hidden="true">
            <button className="city-btn" onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`)}>
              <Facebook size={16} /> Share on Facebook
            </button>
            <button
              className="city-btn"
              onClick={() => share(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${city.name} on Aaslema!`)}&url=${pageUrl}`)}
            >
              <Twitter size={16} /> Share on X
            </button>
            <button className="btn btn--primary" onClick={copyLink}>
              <Share2 size={16} /> {copied ? 'Link copied!' : 'Copy link'}
            </button>
            </fieldset>
          </div>
        </Modal>
      )}
    </>
  )
}
