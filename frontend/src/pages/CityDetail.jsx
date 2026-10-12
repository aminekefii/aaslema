import { useEffect, useState } from 'react'
import {
  Heart, MapPin, ArrowLeft, Utensils, History, Sparkles, Calendar, Share2,
  Navigation, Star, CheckCircle2, Map as MapIcon, Camera, Facebook, Twitter,
} from 'lucide-react'
import { cities } from '../cities.js'
import Modal from '../components/Modal.jsx'

// Port of aaslema-new's CityDetail page. Aaslema keeps likes, visits and moments in
// Supabase; this template has no backend, so they live in the viewer's browser.
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

const EMPTY_MOMENT = { url: '', location: '', description: '' }

export default function CityDetail({ id }) {
  const city = cities.find((c) => c.id === id)
  const [hasLiked, setHasLiked] = useState(() => readList('liked_cities').includes(id))
  const [isInPlan, setIsInPlan] = useState(() => city && readList('planned_cities').includes(city.name))
  const [isVisited, setIsVisited] = useState(() => readList('visited_cities').includes(id))
  const [activeTab, setActiveTab] = useState('overview')
  const [moments, setMoments] = useState(() => readList(`moments_${id}`))
  const [isUploading, setIsUploading] = useState(false)
  const [newMoment, setNewMoment] = useState(EMPTY_MOMENT)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = `${city ? city.name : 'City not found'} - Aaslema`
  }, [city])

  if (!city) {
    return (
      <section className="page-banner city-missing">
        <div className="container">
          <MapPin size={40} />
          <h1>City not found</h1>
          <p>We couldn't find the governorate you're looking for.</p>
          <a href="/destinations" className="btn btn--primary">Browse other cities</a>
        </div>
      </section>
    )
  }

  const likes = city.likes + (hasLiked ? 1 : 0)

  const handleLike = () => {
    writeList('liked_cities', toggleIn(readList('liked_cities'), city.id))
    setHasLiked(!hasLiked)
  }
  const handleAddToPlan = () => {
    writeList('planned_cities', toggleIn(readList('planned_cities'), city.name))
    setIsInPlan(!isInPlan)
  }
  const handleToggleVisited = () => {
    writeList('visited_cities', toggleIn(readList('visited_cities'), city.id))
    setIsVisited(!isVisited)
  }

  const openUpload = (location = '') => {
    setNewMoment({ ...EMPTY_MOMENT, location })
    setIsUploading(true)
  }
  const handleFinishUpload = (e) => {
    e.preventDefault()
    if (!newMoment.url) return
    const moment = {
      id: Date.now(),
      url: newMoment.url,
      location: newMoment.location,
      description: newMoment.description,
      date: new Date().toISOString(),
    }
    const updated = [moment, ...moments]
    setMoments(updated)
    // Large photos can exceed browser storage; they still show for this visit.
    writeList(`moments_${city.id}`, updated)
    setIsUploading(false)
    setNewMoment(EMPTY_MOMENT)
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
          <a href="/destinations" className="city-hero__back"><ArrowLeft size={16} /> Back to destinations</a>

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
                <button onClick={handleLike} aria-pressed={hasLiked} className={`city-btn ${hasLiked ? 'city-btn--primary' : ''}`}>
                  <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
                  {hasLiked ? 'Liked' : 'Like'} · {likes}
                </button>
                <button onClick={handleAddToPlan} aria-pressed={isInPlan} className={`city-btn ${isInPlan ? 'city-btn--soft' : ''}`}>
                  {isInPlan ? <CheckCircle2 size={16} /> : <Calendar size={16} />}
                  {isInPlan ? 'In your plan' : 'Add to plan'}
                </button>
                <button onClick={handleToggleVisited} aria-pressed={isVisited} className={`city-btn ${isVisited ? 'city-btn--soft' : ''}`}>
                  {isVisited ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
                  {isVisited ? 'Visited' : 'Mark as visited'}
                </button>
                <button onClick={() => setShowShareModal(true)} className="city-btn city-btn--ghost" aria-label={`Share ${city.name}`}>
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>

            <img src={city.image} alt={city.name} className="city-hero__image" />
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
                    const spotMoments = moments.filter((m) => m.location === h)
                    return (
                      <div key={h} className="cd-card city-highlight">
                        <div className="city-highlight__top">
                          <span className="city-highlight__icon"><Navigation size={18} /></span>
                          <button onClick={() => openUpload(h)} className="city-icon-btn" aria-label={`Add a moment at ${h}`} title="Add a moment">
                            <Camera size={18} />
                          </button>
                        </div>
                        <h3>{h}</h3>
                        <p>A key stop on the {city.name} trail.</p>
                        {spotMoments.length > 0 && (
                          <div className="city-highlight__moments">
                            <div className="city-highlight__thumbs">
                              {spotMoments.slice(0, 3).map((m) => <img key={m.id} src={m.url} alt="" />)}
                            </div>
                            <span>{spotMoments.length} {spotMoments.length === 1 ? 'moment' : 'moments'}</span>
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
                <button onClick={() => openUpload()} className="btn btn--primary"><Camera size={16} /> Add moment</button>
              </div>

              {moments.length === 0 ? (
                <div className="cd-card city-empty">
                  <MapIcon size={32} />
                  <p>No moments yet. Add the first photo from {city.name}.</p>
                </div>
              ) : (
                <div className="city-moments">
                  {moments.map((moment) => (
                    <figure key={moment.id} className="cd-card city-moment">
                      <div className="city-moment__image">
                        <img src={moment.url} alt={moment.description || 'Moment'} loading="lazy" />
                      </div>
                      <figcaption>
                        {moment.location && <p className="city-moment__place"><Navigation size={12} /> {moment.location}</p>}
                        {moment.description && <p className="city-moment__text">{moment.description}</p>}
                        <small>{new Date(moment.date).toLocaleDateString()}</small>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Moment upload modal */}
      {isUploading && (
        <Modal title="Add a moment" labelId="moment-dialog-title" onClose={() => setIsUploading(false)} wide>
          <p className="modal__sub">Share a photo from your trip to {city.name}.</p>
          <form onSubmit={handleFinishUpload} className="moment-form">
            {newMoment.url ? (
              <div className="moment-form__preview">
                <img src={newMoment.url} alt="Preview" />
                <button type="button" onClick={() => setNewMoment({ ...newMoment, url: '' })}>Change photo</button>
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
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setNewMoment((m) => ({ ...m, url: reader.result }))
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
            )}

            <label>
              Location
              <select value={newMoment.location} onChange={(e) => setNewMoment({ ...newMoment, location: e.target.value })}>
                <option value="">General area</option>
                {city.highlights.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>

            <label>
              Caption
              <textarea
                rows={3}
                placeholder="What made this spot special?"
                value={newMoment.description}
                onChange={(e) => setNewMoment({ ...newMoment, description: e.target.value })}
              />
            </label>

            <button type="submit" disabled={!newMoment.url} className="btn btn--primary">Save moment</button>
          </form>
        </Modal>
      )}

      {/* Share modal */}
      {showShareModal && (
        <Modal title={`Share ${city.name}`} labelId="share-dialog-title" onClose={() => setShowShareModal(false)}>
          <div className="share-options">
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
          </div>
        </Modal>
      )}
    </>
  )
}
