import { useEffect, useState } from 'react'
import { Send, Star } from 'lucide-react'
import { supabase } from '../supabase.js'
import { BODY_MAX, reviewFromForm, savedMessage, textLength, travelStyles } from '../reviews.js'

const saveFailed = "Couldn't save your review. Please try again."

export default function Review({ user }) {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [review, setReview] = useState(null) // the saved review, null if none yet
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [travelStyle, setTravelStyle] = useState('')
  const [body, setBody] = useState('')
  // null, 'saving', { done } or { error }
  const [status, setStatus] = useState(null)

  const fill = (row) => {
    setReview(row)
    if (!row) return
    setRating(row.rating)
    setTravelStyle(row.travel_style)
    setBody(row.body)
  }

  const load = async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('reviews').select('*').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      fill(data)
    } catch {
      setLoadFailed(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    document.title = 'Rate your trip - Aaslema'
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const result = reviewFromForm({ rating, travelStyle, body }, user)
    if (result.error) return setStatus({ error: result.error })

    setStatus('saving')
    try {
      const query = review
        ? supabase.from('reviews').update(result.row).eq('id', review.id)
        : supabase.from('reviews').insert(result.row)
      const { data, error } = await query.select().single()
      // Saved from another tab in the meantime: show that one
      if (error?.code === '23505') {
        await load()
        return setStatus({ done: "You already have a review; it's shown below." })
      }
      if (error) throw error
      fill(data)
      setStatus({ done: savedMessage(data) })
    } catch {
      setStatus({ error: saveFailed })
    }
  }

  return (
    <>
      <h1>Rate your trip</h1>
      <p className="profile-card__lead">Tell other travellers how your trip went.</p>
      <div className="review-page">
        {loading ? (
          <p className="review-page__note">Loading your review…</p>
        ) : loadFailed ? (
          <p className="review-page__note contact__error">
            Couldn't load your review.{' '}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        ) : (
          <form className="contact__form" onSubmit={submit} noValidate>
            <h2>{review ? 'Your review' : 'Leave a review'}</h2>
            {review && (
              <p className={`review-form__status ${review.approved_at ? 'review-form__status--live' : ''}`}>
                {review.approved_at ? 'Published on the site' : 'Waiting for approval'}
              </p>
            )}
            <fieldset className="contact__fieldset" disabled={status === 'saving'}>
              <div className="review-form__stars" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                    className={n <= (hover || rating) ? 'on' : ''}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                  >
                    <Star size={30} fill="currentColor" />
                  </button>
                ))}
              </div>
              <label>
                Travel style
                <select value={travelStyle} onChange={(e) => setTravelStyle(e.target.value)}>
                  <option value="" disabled>Choose your travel style</option>
                  {travelStyles.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                Your review
                <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
                <span className="review-form__count">{textLength(body.trim())} / {BODY_MAX}</span>
              </label>
              <button type="submit" className="btn btn--primary">
                {status === 'saving' ? 'Saving…' : <>{review ? 'Update review' : 'Submit review'} <Send size={16} /></>}
              </button>
              {review?.approved_at && <p className="review-form__hint">Changing your review sends it back for approval.</p>}
            </fieldset>
            {status?.done && <p className="contact__sent" role="status">{status.done}</p>}
            {status?.error && <p className="contact__error" role="alert">{status.error}</p>}
          </form>
        )}
      </div>
    </>
  )
}
