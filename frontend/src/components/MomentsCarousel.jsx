import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, Navigation } from 'lucide-react'
import usePerView from '../usePerView.js'
import { timeAgo } from '../timeAgo.js'

// Visitors (no onLike) get a sign-in link showing the count instead of a button
function LikeButton({ moment, onLike }) {
  const content = (
    <>
      <Heart size={16} fill={moment.liked ? 'currentColor' : 'none'} />
      <span>{moment.likes}</span>
    </>
  )
  if (!onLike) {
    return <a href="/signin" className="moment-card__like" aria-label={`${moment.likes} likes. Sign in to like this moment`}>{content}</a>
  }
  return (
    <button
      type="button"
      className={`moment-card__like ${moment.liked ? 'moment-card__like--on' : ''}`}
      onClick={() => onLike(moment)}
      aria-pressed={moment.liked}
      aria-label={`Like this moment (${moment.likes} likes)`}
    >
      {content}
    </button>
  )
}

// Approved moments of a destination: arrows and swipe, 3 / 2 / 1 cards, no autoplay.
export default function MomentsCarousel({ moments, onLike }) {
  const perView = usePerView()
  const positions = Math.max(1, moments.length - perView + 1)
  const [index, setIndex] = useState(0)
  const dragStart = useRef(null)

  useEffect(() => setIndex((i) => Math.min(i, positions - 1)), [positions])

  const go = (i) => setIndex(Math.max(0, Math.min(positions - 1, i)))
  const onPointerDown = (e) => { dragStart.current = e.clientX }
  const onPointerUp = (e) => {
    if (dragStart.current !== null) {
      const dx = e.clientX - dragStart.current
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
    }
    dragStart.current = null
  }

  return (
    <div className="moments-carousel">
      {positions > 1 && (
        <button type="button" className="moments-carousel__arrow moments-carousel__arrow--prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous moments">
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="moments-carousel__viewport" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <div className="moments-carousel__track" style={{ transform: `translateX(-${(index * 100) / perView}%)` }}>
          {moments.map((m) => (
            <figure key={m.id} className="moment-card" style={{ flexBasis: `${100 / perView}%` }}>
              <div className="moment-card__inner">
                <img src={m.url} alt={m.caption} draggable="false" />
                <figcaption>
                  <strong>{m.author_name}</strong>
                  <p className="moment-card__caption">{m.caption}</p>
                  {m.spot && <p className="moment-card__spot"><Navigation size={12} /> {m.spot}</p>}
                  <div className="moment-card__footer">
                    <time dateTime={m.created_at}>{timeAgo(m.created_at)}</time>
                    <LikeButton moment={m} onLike={onLike} />
                  </div>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
      {positions > 1 && (
        <button type="button" className="moments-carousel__arrow moments-carousel__arrow--next" onClick={() => go(index + 1)} disabled={index === positions - 1} aria-label="Next moments">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}
