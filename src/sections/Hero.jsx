import { MapPin, Flag, CalendarDays, Users, Search } from 'lucide-react'
import { heroImage } from '../data.js'

const fields = [
  { icon: MapPin, label: 'Destinations', options: ['City or Region', 'Europe', 'Asia', 'Africa', 'Americas'] },
  { icon: Flag, label: 'All Activity', options: ['Choose Activity', 'Hiking', 'Beach', 'City Tour', 'Safari'] },
  { icon: CalendarDays, label: 'Departure Date', type: 'date' },
  { icon: Users, label: 'Guests', options: ['1 Guest', '2 Guests', '3 Guests', '4+ Guests'] },
]

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container-fluid">
        <h1 className="hero__title" data-aos="flip-up" data-aos-delay="50">Tour &amp; Travel</h1>
        <div className="hero__banner" style={{ backgroundImage: `url(${heroImage})` }} />
      </div>

      <div className="container container--1400">
        <form className="search-filter" onSubmit={(e) => e.preventDefault()} data-aos="zoom-out-down">
          {fields.map(({ icon: Icon, label, options, type }) => (
            <label key={label} className="search-filter__item">
              <span className="search-filter__label"><Icon size={16} /> {label}</span>
              {type === 'date'
                ? <input type="date" />
                : <select>{options.map((o) => <option key={o}>{o}</option>)}</select>}
            </label>
          ))}
          <button type="submit" className="btn btn--primary search-filter__btn">
            Search <Search size={16} />
          </button>
        </form>
      </div>
    </section>
  )
}
