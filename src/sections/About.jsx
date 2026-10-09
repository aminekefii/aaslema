import { ArrowRight, MapPin, Rocket, Target, Tent, CarFront, Plane, Camera } from 'lucide-react'
import CountUp from '../components/CountUp.jsx'
import { images } from '../data.js'

// Small icon bubbles that orbit the photo as the outer ring rotates.
const orbitIcons = [
  { icon: MapPin, color: '#e5533d' },
  { icon: Rocket, color: '#3b82f6' },
  { icon: Target, color: '#e11d48' },
  { icon: Tent, color: '#63ab45' },
  { icon: CarFront, color: '#f7921e' },
  { icon: Plane, color: '#8b5cf6' },
  { icon: Camera, color: '#0ea5e9' },
]

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container about__grid">
        <div className="about__content" data-aos="fade-left">
          <div className="section-title section-title--left">
            <h2>Travel Tunisia Like a Local: Why Backpackers Choose Aaslema</h2>
          </div>
          <p>Louages between towns, guesthouses in the medina, coastal roads and gravel tracks into the Sahara. Aaslema brings together city guides, an AI trip planner and a community of travelers who have ridden the route before you.</p>

          <div className="divider">
            <span>Guides for all <em><CountUp end={24} duration={3000} /> governorates</em> of Tunisia</span>
          </div>

          <div className="about__counters">
            <div className="counter">
              <strong><CountUp end={24} duration={3000} /></strong>
              <span>City Guides</span>
            </div>
            <div className="counter">
              <strong><CountUp end={3} duration={3000} /></strong>
              <span>Ways to Travel: Backpacking, Bikepacking &amp; History</span>
            </div>
          </div>

          <a href="#destinations" className="btn btn--primary">Browse Destinations <ArrowRight size={16} /></a>
        </div>

        <div data-aos="fade-right">
          <div className="about-orbit">
            {orbitIcons.map(({ icon: Icon, color }, i) => (
              <span key={i} className="about-orbit__shape" style={{ color }}>
                <Icon size={22} />
              </span>
            ))}
            <img src={images.about} alt="Smiling traveler with a suitcase" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  )
}
