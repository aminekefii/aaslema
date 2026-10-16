import { useCallback, useEffect, useState } from 'react'
import { cities } from '../cities.js'
import { fetchMyVisits } from '../cityActivity.js'
import { visitedCards } from '../cityCounts.js'
import { timeAgo } from '../timeAgo.js'

// Profile dashboard: destinations the user marked as visited, newest first; each card opens the destination.
export default function VisitedDestinations() {
  // undefined while loading, null if loading failed
  const [visits, setVisits] = useState(undefined)

  const load = useCallback(async () => {
    setVisits(undefined)
    const rows = await fetchMyVisits()
    setVisits(rows && visitedCards(rows, cities))
  }, [])

  useEffect(() => {
    document.title = 'Visited destinations - Aaslema'
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <h1>Visited destinations</h1>
      {visits && (
        <p className="profile-card__lead">{visits.length} of {cities.length} destinations visited</p>
      )}
      {visits === undefined && <p className="profile-note">Loading your visits…</p>}
      {visits === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load your visits.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {visits?.length === 0 && (
        <p className="profile-note">You haven't marked any destinations as visited yet. <a href="/app/destinations">Explore destinations</a></p>
      )}
      {visits?.length > 0 && (
        <div className="my-moments">
          {visits.map((v) => (
            <a key={v.id} href={`/app/destinations/${v.id}`} className="my-moment">
              <img src={v.image} alt="" className="my-moment__photo" />
              <div className="my-moment__body">
                <strong>{v.name}</strong>
                <p className="my-moment__title">{v.title}</p>
                <time dateTime={v.visitedAt} className="my-moment__footer">Visited {timeAgo(v.visitedAt).replace('Just now', 'just now')}</time>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
