import { useCallback, useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { fetchMyCityRows } from '../cityActivity.js'
import { allFestivals, festivalCards } from '../festivals.js'
import { timeAgo } from '../timeAgo.js'

// My plan: festivals the user added on the festivals page, newest first; each card opens its region.
export default function PlanFestivals() {
  // undefined while loading, null if loading failed
  const [items, setItems] = useState(undefined)

  const load = useCallback(async () => {
    setItems(undefined)
    const rows = await fetchMyCityRows('festival_plans', 'festival_id')
    setItems(rows && festivalCards(rows, allFestivals()))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <h2 className="plan-part__title">Festivals{items ? ` (${items.length})` : ''}</h2>
      {items === undefined && <p className="profile-note">Loading…</p>}
      {items === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load this list.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {items?.length === 0 && (
        <p className="profile-note">No festivals in your plan yet. <a href="/app/festivals">Browse festivals</a></p>
      )}
      {items?.length > 0 && (
        <div className="my-moments">
          {items.map((f) => (
            <a key={f.id} href={`/app/festivals#${f.regionId}`} className="my-moment">
              <div className="my-moment__body">
                <strong>{f.name}</strong>
                <p className="my-moment__title">{f.region}</p>
                <p className="my-moment__spot"><CalendarDays size={12} /> {f.when}</p>
                <time dateTime={f.at} className="my-moment__footer">Added {timeAgo(f.at).replace('Just now', 'just now')}</time>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
