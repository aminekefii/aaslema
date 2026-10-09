import { ChevronRight } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { popularDestinations } from '../data.js'

export default function PopularDestinations() {
  return (
    <section className="section popular" id="destinations">
      <div className="container">
        <SectionTitle title="Most Visited" />
        <div className="popular__grid">
          {popularDestinations.map((d, i) => (
            <article key={d.name} className={`destination-card ${i === 0 || i === 5 ? 'destination-card--wide' : ''}`}>
              <img src={d.image} alt={d.name} loading="lazy" />
              <div className="destination-card__content">
                <div>
                  <h3>{d.name}</h3>
                  <span>{d.info}</span>
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
