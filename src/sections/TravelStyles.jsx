import { Backpack, Bike, Landmark } from 'lucide-react'
import { travelStyles } from '../data.js'

const icons = { backpack: Backpack, bike: Bike, landmark: Landmark }

// Three travel styles, mirroring the band on aaslema-new's Home page.
export default function TravelStyles() {
  return (
    <section className="section travel-styles">
      <div className="container">
        <div className="travel-styles__grid">
          {travelStyles.map((s, i) => {
            const Icon = icons[s.icon]
            return (
              <div key={s.title} className="travel-style" data-aos="fade-up" data-aos-delay={i * 100}>
                <span className="travel-style__icon"><Icon size={18} /></span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
