import { Heart, MapPin, Star, ChevronRight } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { tours } from '../data.js'

export default function Tours() {
  return (
    <section className="section section--dark tours" id="tours">
      <div className="container-fluid">
        <div data-aos="fade-up"><SectionTitle dark title="Discover the World’s Treasures with Aaslema" count={34500} /></div>
        <div className="grid grid--4">
          {tours.map((t, i) => (
            <article key={t.title} className="tour-card" data-aos="fade-up" data-aos-delay={i * 100}>
              <div className="tour-card__image">
                <span className="ribbon"><Star size={14} fill="currentColor" /> {t.rating}</span>
                <button className="heart" aria-label="Save"><Heart size={16} /></button>
                <img src={t.image} alt={t.title} loading="lazy" />
              </div>
              <div className="tour-card__body">
                <span className="location"><MapPin size={14} /> {t.location}</span>
                <h3><a href="#">{t.title}</a></h3>
                <p className="tour-card__meta">{t.meta}</p>
              </div>
              <div className="tour-card__footer">
                <span className="price"><strong>${t.price.toFixed(2)}</strong>/per person</span>
                <a href="#" className="read-more">Book Now <ChevronRight /></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
