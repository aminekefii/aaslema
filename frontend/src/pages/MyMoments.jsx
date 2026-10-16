import { useCallback, useEffect, useState } from 'react'
import { Heart, Navigation } from 'lucide-react'
import { cities } from '../cities.js'
import { myMomentCard } from '../moments.js'
import { fetchMyMoments } from '../momentsApi.js'
import { timeAgo } from '../timeAgo.js'

// Profile dashboard: every moment the user uploaded, pending ones too. View only.
export default function MyMoments() {
  // undefined while loading, null if loading failed
  const [moments, setMoments] = useState(undefined)

  const load = useCallback(async () => {
    setMoments(undefined)
    const rows = await fetchMyMoments()
    setMoments(rows && rows.map((r) => myMomentCard(r, cities)))
  }, [])

  useEffect(() => {
    document.title = 'My moments - Aaslema'
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <h1>My moments</h1>
      <p className="profile-card__lead">Photos you shared from destinations.</p>
      {moments === undefined && <p className="profile-note">Loading your moments…</p>}
      {moments === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load your moments.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {moments?.length === 0 && (
        <p className="profile-note">You haven't shared any moments yet. <a href="/app/destinations">Explore destinations</a></p>
      )}
      {moments?.length > 0 && (
        <div className="my-moments">
          {moments.map((m) => (
            <article key={m.key} className="my-moment">
              {m.url
                ? <img src={m.url} alt={m.caption} className="my-moment__photo" />
                : <div className="my-moment__photo my-moment__photo--missing">Photo unavailable</div>}
              <div className="my-moment__body">
                <span className={`admin-badge ${m.published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>
                  {m.published ? 'Published' : 'Waiting for approval'}
                </span>
                <strong>{m.cityName}</strong>
                {m.spot && <p className="my-moment__spot"><Navigation size={12} /> {m.spot}</p>}
                <p className="my-moment__caption">{m.caption}</p>
                <div className="my-moment__footer">
                  <time dateTime={m.postedAt}>{timeAgo(m.postedAt)}</time>
                  {m.published && (
                    <span className="my-moment__likes" aria-label={`${m.likes} likes`}>
                      <Heart size={14} aria-hidden="true" /> {m.likes}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
