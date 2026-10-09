import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'
import CountUp from '../components/CountUp.jsx'
import Stars from '../components/Stars.jsx'
import { testimonials, images } from '../data.js'

// Two cards fit side by side on wide screens, one on phones.
function usePerView() {
  const query = '(min-width: 768px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setWide(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide ? 2 : 1
}

export default function Testimonials() {
  const [active, setActive] = useState(0)
  const perView = usePerView()
  const pages = Math.ceil(testimonials.length / perView)

  useEffect(() => setActive(0), [perView])

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % pages), 6000)
    return () => clearInterval(id)
  }, [pages])

  return (
    <section className="section testimonials">
      <div className="container testimonials__grid">
        <div className="testimonials__image">
          <img src={images.testimonial} alt="Planning a trip" loading="lazy" />
        </div>

        <div className="testimonials__content">
          <div className="section-title section-title--left">
            <span className="big-number"><CountUp end={5280} /></span>
            <h2>Global Clients Say About Our Services</h2>
          </div>

          <div className="testimonials__viewport">
            <div className="testimonials__track" style={{ transform: `translateX(-${active * 100}%)` }}>
              {testimonials.map((t) => (
                <figure key={t.name} className="testimonial-card">
                  <div className="testimonial-card__top">
                    <Quote size={36} className="quote-icon" />
                    <div>
                      <h4>Quality Services</h4>
                      <Stars />
                    </div>
                  </div>
                  <blockquote>“{t.quote}”</blockquote>
                  <figcaption>
                    <img src={t.avatar} alt={t.name} />
                    <div>
                      <strong>{t.name}</strong>
                      <span>{t.role}</span>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="dots">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} className={i === active ? 'active' : ''} onClick={() => setActive(i)} aria-label={`Show reviews ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
