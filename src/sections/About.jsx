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
            <h2>Travel with Confidence Top Reasons to Choose Our Agency</h2>
          </div>
          <p>We go above and beyond to make your travel dreams a reality, from hidden gems to the must-see attractions.</p>

          <div className="divider">
            <span>We have <em><CountUp end={25} duration={3000} /> Years</em> of experience</span>
          </div>

          <div className="about__counters">
            <div className="counter">
              <strong><CountUp end={3} duration={3000} suffix="K+" /></strong>
              <span>Popular Destinations</span>
            </div>
            <div className="counter">
              <strong><CountUp end={9} duration={3000} suffix="M+" /></strong>
              <span>Satisfied Clients</span>
            </div>
          </div>

          <a href="#destinations" className="btn btn--primary">Explore Destinations <ArrowRight size={16} /></a>
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
