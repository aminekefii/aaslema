import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { popularDestinations } from '../data.js'
import { cities } from '../cities.js'
import { fetchVisitCounts } from '../cityActivity.js'
import { likeCount, mostVisited } from '../cityCounts.js'

// The hand-picked six first (they show until counts load and win ties), then every other city
const candidates = [
  ...popularDestinations,
  ...cities
    .filter((c) => !popularDestinations.some((d) => d.id === c.id))
    .map((c) => ({ id: c.id, image: c.gallery[1] ?? c.image, name: c.name, info: c.vibe })),
]

const visitsLabel = (n) => `${n} ${n === 1 ? 'visit' : 'visits'}`

export default function PopularDestinations() {
  const [counts, setCounts] = useState(null) // null until loaded, or if loading failed

  useEffect(() => {
    fetchVisitCounts().then(setCounts)
  }, [])

  const shown = mostVisited(counts, candidates, popularDestinations.length)

  return (
    <section className="section popular" id="destinations">
      <div className="container">
        <SectionTitle title="Most visited" />
        <div className="popular__grid">
          {shown.map((d, i) => (
            <article key={d.id} className={`destination-card ${i === 0 || i === 5 ? 'destination-card--wide' : ''}`}>
              <img src={d.image} alt={d.name} loading="lazy" />
              <div className="destination-card__content">
                <div>
                  <h3>{d.name}</h3>
                  <span>{d.info}{counts && ` · ${visitsLabel(likeCount(counts, d.id))}`}</span>
                </div>
                <a href={`/destinations/${d.id}`} className="circle-btn" aria-label={`Explore ${d.name}`}><ChevronRight size={18} /></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
