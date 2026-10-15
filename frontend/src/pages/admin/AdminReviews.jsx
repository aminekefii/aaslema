import { useEffect, useState } from 'react'
import Stars from '../../components/Stars.jsx'
import { supabase } from '../../supabase.js'
import { lastSeen } from '../../adminUsers.js'
import { filterReviews, isPublished, reviewCounts } from '../../adminReviews.js'

const tabs = [['pending', 'Pending'], ['published', 'Published'], ['all', 'All']]

// Tells the sidebar to refresh its pending-review count
const notifyChanged = () => window.dispatchEvent(new Event('admin:reviews-changed'))

export default function AdminReviews() {
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pending')

  const load = async () => {
    setError(null)
    setReviews(null)
    try {
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
      if (error) setError(error)
      else setReviews(data ?? [])
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Reviews - Aaslema Admin'
    load()
  }, [])

  const replace = (updated) => setReviews((list) => list.map((r) => (r.id === updated.id ? updated : r)))
  const remove = (id) => setReviews((list) => list.filter((r) => r.id !== id))

  if (error) {
    return (
      <>
        <h1>Reviews</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load reviews: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (reviews === null) {
    return <><h1>Reviews</h1><p className="admin-note">Loading reviews…</p></>
  }

  const counts = reviewCounts(reviews)
  const shown = filterReviews(reviews, tab)

  return (
    <>
      <h1>Reviews</h1>
      <div className="admin-tabs" role="tablist" aria-label="Filter reviews">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="admin-note">{tab === 'pending' ? 'No reviews waiting for approval.' : 'No reviews here.'}</p>
      ) : (
        <ul className="admin-msgs">
          {shown.map((r) => <ReviewItem key={r.id} review={r} onChange={replace} onRemove={remove} />)}
        </ul>
      )}
    </>
  )
}

function ReviewItem({ review, onChange, onRemove }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const published = isPublished(review)

  const act = async (action) => {
    setBusy(true)
    setFailed(false)
    try {
      await action()
      notifyChanged()
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  // .single() errors when no row matched (deleted meanwhile, or no admin rights)
  const toggle = () => act(async () => {
    const approved_at = published ? null : new Date().toISOString()
    const { data, error } = await supabase.from('reviews').update({ approved_at }).eq('id', review.id).select().single()
    if (error) throw error
    onChange(data)
  })

  // A delete that matches no row returns no error, so check it hit one
  const remove = () => act(async () => {
    const { data, error } = await supabase.from('reviews').delete().eq('id', review.id).select('id')
    if (error || !data?.length) throw error ?? new Error('Review not deleted')
    onRemove(review.id)
  })

  return (
    <li className="admin-msg admin-review">
      <div className="admin-review__head">
        <Stars count={review.rating} />
        <span className={`admin-badge ${published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>{published ? 'Published' : 'Pending'}</span>
        <span className="admin-review__date">{lastSeen(review.updated_at)}</span>
      </div>
      <p className="admin-msg__text">{review.body}</p>
      <p className="admin-review__by"><strong>{review.author_name}</strong> · {review.travel_style}</p>
      <div className="admin-msg__actions">
        {confirming ? (
          <>
            <span className="admin-review__confirm">Delete this review?</span>
            <button type="button" className="btn btn--sm admin-btn-danger" disabled={busy} onClick={remove}>Delete</button>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={toggle}>{published ? 'Unpublish' : 'Approve'}</button>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(true)}>Delete</button>
          </>
        )}
      </div>
      {failed && <p className="admin-note--error admin-msg__error">Couldn't update this review. Try again.</p>}
    </li>
  )
}
