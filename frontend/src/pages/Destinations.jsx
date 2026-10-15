import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Heart, Search, Users } from 'lucide-react'
import { cities } from '../cities.js'
import { base } from '../route.js'
import { likeCount } from '../cityCounts.js'
import { fetchLikeCounts, fetchMyCityIds } from '../cityActivity.js'

// Port of aaslema-new's Guide page: searchable grid of all 24 governorates.
export default function Destinations({ user }) {
  const [query, setQuery] = useState('')
  // Like counts for everyone; null until loaded (or if loading failed)
  const [counts, setCounts] = useState(null)
  const [visited, setVisited] = useState([])
  const userId = user?.id

  useEffect(() => {
    document.title = 'Destinations - Aaslema'
  }, [])

  useEffect(() => {
    fetchLikeCounts().then(setCounts)
  }, [])

  // Visits belong to one user: clear them when the user changes and ignore late answers
  useEffect(() => {
    setVisited([])
    if (!userId) return
    let current = true
    fetchMyCityIds('city_visits').then((ids) => { if (current) setVisited(ids ?? []) })
    return () => { current = false }
  }, [userId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((city) =>
      [city.name, city.title, city.vibe, ...city.highlights].some((field) => field.toLowerCase().includes(q)),
    )
  }, [query])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Destinations</h1>
          <p>Every governorate, from the Roman ruins of the north to the dunes of the Grand Sud.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="guide__toolbar">
            <p>{filtered.length} of {cities.length} governorates</p>
            <label className="guide__search">
              <span className="sr-only">Search destinations</span>
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city or place"
              />
            </label>
          </div>

          {filtered.length > 0 ? (
            <div className="guide__grid">
              {filtered.map((city) => {
                const isVisited = visited.includes(city.id)
                const likes = likeCount(counts, city.id)
                return (
                  <a key={city.id} href={`${base}/destinations/${city.id}`} className={`guide-card ${isVisited ? 'guide-card--visited' : ''}`}>
                    <div className="guide-card__image">
                      <img src={city.image} alt={city.name} loading="lazy" />
                      {isVisited && <span className="guide-card__visited"><CheckCircle2 size={20} /> Visited</span>}
                    </div>
                    <div className="guide-card__head">
                      <div>
                        <h2>
                          {city.name}
                          {isVisited && <span className="sr-only"> (visited)</span>}
                        </h2>
                        <p>{city.title}</p>
                      </div>
                      <span className={`guide-card__likes ${likes > 0 ? 'is-liked' : ''}`} title="Likes">
                        <Heart size={14} /> {counts && likes}
                      </span>
                    </div>
                    <div className="guide-card__chips">
                      <span className="chip">{city.vibe}</span>
                      <span className="chip"><Users size={12} /> {city.population}</span>
                    </div>
                  </a>
                )
              })}
            </div>
          ) : (
            <div className="guide__empty">
              <p className="guide__empty-title">No destinations match "{query}"</p>
              <p>Try a city name like Tozeur, or a place like Carthage.</p>
              <button type="button" onClick={() => setQuery('')} className="btn btn--primary">Clear search</button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
