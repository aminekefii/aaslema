import { useCallback, useEffect, useState } from 'react'
import { cities } from '../cities.js'
import { fetchMyCityRows } from '../cityActivity.js'
import { myCityCards } from '../cityCounts.js'
import { timeAgo } from '../timeAgo.js'

// Profile dashboard list of destinations from one of the user's tables (visits or plan), newest first;
// each card opens the destination. With `heading`, it is one part of a page: an h2 with the count instead of
// the page h1 and count line.
export default function CityListSection({ table, title, heading, countText, emptyText, dateLabel }) {
  // undefined while loading, null if loading failed
  const [items, setItems] = useState(undefined)

  const load = useCallback(async () => {
    setItems(undefined)
    const rows = await fetchMyCityRows(table)
    setItems(rows && myCityCards(rows, cities))
  }, [table])

  useEffect(() => {
    if (title) document.title = `${title} - Aaslema`
  }, [title])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      {heading
        ? <h2 className="plan-part__title">{heading}{items ? ` (${items.length})` : ''}</h2>
        : <h1>{title}</h1>}
      {!heading && items && <p className="profile-card__lead">{countText(items.length)}</p>}
      {items === undefined && <p className="profile-note">Loading…</p>}
      {items === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load this list.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {items?.length === 0 && (
        <p className="profile-note">{emptyText} <a href="/app/destinations">Explore destinations</a></p>
      )}
      {items?.length > 0 && (
        <div className="my-moments">
          {items.map((c) => (
            <a key={c.id} href={`/app/destinations/${c.id}`} className="my-moment">
              <img src={c.image} alt="" className="my-moment__photo" />
              <div className="my-moment__body">
                <strong>{c.name}</strong>
                <p className="my-moment__title">{c.title}</p>
                <time dateTime={c.at} className="my-moment__footer">{dateLabel} {timeAgo(c.at).replace('Just now', 'just now')}</time>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
