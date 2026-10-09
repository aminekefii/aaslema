import { Heart, MapPin, Star, BedDouble, ChefHat, Bath, Wifi, ChevronRight, ArrowRight } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { hotels } from '../data.js'

const amenities = [
  { icon: BedDouble, label: '2 Bed room' },
  { icon: ChefHat, label: '1 kitchen' },
  { icon: Bath, label: '2 Wash room' },
  { icon: Wifi, label: 'Internet' },
]

export default function Hotels() {
  return (
    <section className="section section--dark hotels" id="hotels">
      <div className="container">
        <SectionTitle dark title="Discover the World’s Top Class Hotels" count={34500} />
        <div className="grid grid--2">
          {hotels.map((h) => (
            <article key={h.title} className="hotel-card">
              <div className="hotel-card__image">
                <span className="ribbon"><Star size={14} fill="currentColor" /> {h.rating}</span>
                <button className="heart" aria-label="Save"><Heart size={16} /></button>
                <img src={h.image} alt={h.title} loading="lazy" />
              </div>
              <div className="hotel-card__body">
                <span className="location"><MapPin size={14} /> {h.location}</span>
                <h3><a href="#">{h.title}</a></h3>
                <ul className="amenities">
                  {amenities.map(({ icon: Icon, label }) => <li key={label}><Icon size={15} /> {label}</li>)}
                </ul>
                <div className="hotel-card__footer">
                  <span className="price"><strong>${h.price.toFixed(2)}</strong>/per night</span>
                  <a href="#" className="btn btn--sm btn--primary">Book Now <ChevronRight size={14} /></a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="center">
          <a href="#" className="btn btn--outline-light">Explore More Hotels <ArrowRight size={16} /></a>
        </div>
      </div>
    </section>
  )
}
