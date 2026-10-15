import { useEffect, useRef, useState } from 'react'
import { Quote } from 'lucide-react'
import Stars from '../components/Stars.jsx'
import { testimonials } from '../data.js'
import { initials } from '../names.js'
import { slideCards } from '../reviews.js'
import { fetchPublishedReviews } from '../reviewsApi.js'

// Cards per view, matching travosy-react's tiny-three-item slider (3 / 2 / 1).
function usePerView() {
  const get = () => (window.innerWidth >= 992 ? 3 : window.innerWidth >= 767 ? 2 : 1)
  const [perView, setPerView] = useState(get)
  useEffect(() => {
    const onResize = () => setPerView(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return perView
}

export default function Testimonials() {
  const perView = usePerView()
  const [published, setPublished] = useState(null) // null until loaded, or if loading failed
  const cards = slideCards(published, testimonials)
  const positions = Math.max(1, cards.length - perView + 1)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const dragStart = useRef(null)

  useEffect(() => {
    fetchPublishedReviews().then(setPublished)
  }, [])

  useEffect(() => setActive((a) => Math.min(a, positions - 1)), [positions])

  // Autoplay every 3s and rewind at the end, like the travosy slider.
  useEffect(() => {
    if (paused || positions < 2) return
    const id = setInterval(() => setActive((a) => (a + 1) % positions), 3000)
    return () => clearInterval(id)
  }, [paused, positions])

  const go = (i) => setActive(Math.max(0, Math.min(positions - 1, i)))

  const onPointerDown = (e) => { dragStart.current = e.clientX; setPaused(true) }
  const onPointerUp = (e) => {
    if (dragStart.current !== null) {
      const dx = e.clientX - dragStart.current
      if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1))
    }
    dragStart.current = null
    setPaused(false)
  }

  return (
    <section className="section reviews">
      <div className="container">
        <div className="reviews__head" data-aos="fade-up">
          <h2>What Our Users Say</h2>
          <p>Backpackers and bikepackers on the routes, guesthouses and people they met across Tunisia.</p>
        </div>

        <div
          className="reviews__viewport"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="reviews__track"
            style={{ transform: `translateX(-${(active * 100) / perView}%)` }}
          >
            {cards.map((t) => (
              <figure key={t.key ?? t.name} className="review" style={{ flexBasis: `${100 / perView}%` }}>
                <div className="review__bubble">
                  <Quote size={40} className="review__quote" />
                  <blockquote>“ {t.quote} ”</blockquote>
                  <Stars count={t.rating ?? 5} />
                </div>
                <figcaption>
                  {t.avatar
                    ? <img src={t.avatar} alt={t.name} draggable="false" />
                    : <span className="review__initials" aria-hidden="true">{initials(t.name)}</span>}

                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {positions > 1 && (
          <div className="reviews__dots">
            {Array.from({ length: positions }, (_, i) => (
              <button key={i} className={i === active ? 'active' : ''} onClick={() => go(i)} aria-label={`Show review ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
