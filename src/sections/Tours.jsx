import { ArrowRight } from 'lucide-react'
import { featuredCities } from '../data.js'

export default function Tours() {
  return (
    <section className="section section--dark tours" id="tours">
      <div className="container-fluid">
        <div className="tours__head" data-aos="fade-up">
          <div>
            <h2>Where to start</h2>
            <p>Five places our community keeps coming back to.</p>
          </div>
          <a href="/destinations" className="all-link">
            All destinations <ArrowRight size={16} />
          </a>
        </div>

        <div className="city-grid">
          {featuredCities.map((c, i) => (
            <a key={c.name} href="/destinations" className="city-card" data-aos="fade-up" data-aos-delay={i * 100}>
              <div className="city-card__image">
                <img src={c.image} alt={c.name} loading="lazy" />
              </div>
              <h3>{c.name}</h3>
              <p>{c.vibe}</p>
            </a>
          ))}
        </div>

        <a href="/destinations" className="btn btn--outline-light tours__all-mobile">All destinations</a>
      </div>
    </section>
  )
}
