import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Stars from '../components/Stars.jsx'
import Modal from '../components/Modal.jsx'
import usePerView from '../usePerView.js'
import { testimonials } from '../data.js'
import { initials } from '../names.js'
import { slideCards } from '../reviews.js'
import { fetchPublishedReviews } from '../reviewsApi.js'



export default function Testimonials() {
  const perView = usePerView()
  const [published, setPublished] = useState(null) // null until loaded, or if loading failed
  // Memoized: the measuring effect below re-runs whenever this array changes
  const cards = useMemo(() => slideCards(published, testimonials), [published])
  const positions = Math.max(1, cards.length - perView + 1)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const dragStart = useRef(null)
  const quotes = useRef({}) // blockquote elements by card key, to see which are cut off
  const [clipped, setClipped] = useState({})
  const [openCard, setOpenCard] = useState(null) // card shown in full in the popup

  useEffect(() => {
    fetchPublishedReviews().then(setPublished)
  }, [])

  useEffect(() => setActive((a) => Math.min(a, positions - 1)), [positions])

  // Quotes stop after 5 lines (CSS); offer "Read more" only where text is actually hidden
  useLayoutEffect(() => {
    const measure = () => {
      const next = {}
      for (const [key, el] of Object.entries(quotes.current)) if (el) next[key] = el.scrollHeight > el.clientHeight + 1
      setClipped(next)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [cards, perView])

  // Autoplay every 3s and rewind at the end, like the travosy slider.
  useEffect(() => {
    if (paused || openCard || positions < 2) return
    const id = setInterval(() => setActive((a) => (a + 1) % positions), 3000)
    return () => clearInterval(id)
  }, [paused, openCard, positions])

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
          <h2>What travellers say</h2>
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
            {cards.map((t) => {
              const key = t.key ?? t.name
              return (
              <figure key={key} className="review" style={{ flexBasis: `${100 / perView}%` }}>
                <div className="review__bubble">
                  <blockquote ref={(el) => { quotes.current[key] = el }}>“{t.quote}”</blockquote>
                  {clipped[key] && <button type="button" className="review__more" onClick={() => setOpenCard(t)}>Read more</button>}
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
              )
            })}
          </div>
        </div>

        {openCard && (
          <Modal title={openCard.name} labelId="review-full-title" onClose={() => setOpenCard(null)} wide>
            <div className="review-full">
              {openCard.role && <p className="review-full__role">{openCard.role}</p>}
              <Stars count={openCard.rating ?? 5} />
              <p className="review-full__text">“ {openCard.quote} ”</p>
            </div>
          </Modal>
        )}

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
