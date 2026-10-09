import { Tent, Sailboat, Bike, Fish } from 'lucide-react'
import CountUp from '../components/CountUp.jsx'
import { features, images } from '../data.js'

const icons = { tent: Tent, sailboat: Sailboat, bike: Bike, fish: Fish }

export default function Features() {
  return (
    <section className="section features">
      <div className="container features__grid">
        <div className="features__intro">
          <div className="section-title section-title--left">
            <h2>The Ultimate Travel Experience: Features That Set Our Agency Apart</h2>
          </div>
          <div className="features__media">
            <img src={images.features} alt="Mountain biker on a forest trail" loading="lazy" />
            <div className="happy-badge">
              <div className="avatars">
                {images.avatars.map((a) => <img key={a} src={a} alt="" />)}
                <span>4k+</span>
              </div>
              <p>850K+ Happy Customers</p>
            </div>
          </div>
          <div className="years-box">
            <strong><CountUp end={38} /></strong>
            <span>Years</span>
            <p>We pride ourselves on offering personalized itineraries.</p>
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
