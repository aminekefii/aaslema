import { Tent, Sailboat, Bike, Fish } from 'lucide-react'
import { features, images } from '../data.js'

const icons = { tent: Tent, sailboat: Sailboat, bike: Bike, fish: Fish }

export default function Features() {
  return (
    <section className="section features">
      <div className="container features__grid">
        <div className="features__intro">
          <div className="section-title section-title--left">
            <h2>Everything You Need to Explore Tunisia: Guides, Planner &amp; Community</h2>
          </div>
          <div className="features__media">
            <img src={images.features} alt="Mountain biker on a forest trail" loading="lazy" />
          </div>
        </div>

        <div className="features__list">
          {features.map((f) => {
            const Icon = icons[f.icon]
            return (
              <div key={f.title} className="feature-card">
                <span className="feature-card__icon"><Icon size={34} strokeWidth={1.5} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
