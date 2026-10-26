import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Heart, Navigation, Trash2 } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import { cities } from '../cities.js'
import { myMomentCard } from '../moments.js'
import { deleteMyMoment, fetchMyMoments } from '../momentsApi.js'
import { timeAgo } from '../timeAgo.js'

// Profile dashboard: every moment the user uploaded, pending ones too. Delete asks first.
export default function MyMoments() {
  // undefined while loading, null if loading failed
  const [moments, setMoments] = useState(undefined)
  const [deletingMoment, setDeletingMoment] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setMoments(undefined)
    const rows = await fetchMyMoments()
    setMoments(rows && rows.map((r) => myMomentCard(r, cities)))
  }, [])

  useEffect(() => {
    document.title = 'My moments - Aaslema'
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteMyMoment(deletingMoment.key, deletingMoment.imagePath)
    setDeleting(false)
    if (!result.error) setMoments((prev) => prev?.filter((m) => m.key !== deletingMoment.key))
    setDeletingMoment(null)
    setToast(result.error ?? 'Moment deleted')
  }

  return (
    <>
      <h1>My moments</h1>
      <p className="profile-card__lead">Photos you shared from destinations.</p>
      {moments === undefined && <p className="profile-note">Loading your moments…</p>}
      {moments === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load your moments.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {moments?.length === 0 && (
        <p className="profile-note">You haven't shared any moments yet. <a href="/app/destinations">Explore destinations</a></p>
      )}
      {moments?.length > 0 && (
        <div className="my-moments">
          {moments.map((m) => (
            <article key={m.key} className="my-moment">
              {m.url
                ? <img src={m.url} alt={m.caption} className="my-moment__photo" />
                : <div className="my-moment__photo my-moment__photo--missing">Photo unavailable</div>}
              <div className="my-moment__body">
                <span className={`admin-badge ${m.published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>
                  {m.published ? 'Published' : 'Waiting for approval'}
                </span>
                <strong>{m.cityName}</strong>
                {m.spot && <p className="my-moment__spot"><Navigation size={12} /> {m.spot}</p>}
                <p className="my-moment__caption">{m.caption}</p>
                <div className="my-moment__footer">
                  <time dateTime={m.postedAt}>{timeAgo(m.postedAt)}</time>
                  {m.published && (
                    <span className="my-moment__likes" aria-label={`${m.likes} likes`}>
                      <Heart size={14} aria-hidden="true" /> {m.likes}
                    </span>
                  )}
                  <button type="button" onClick={() => setDeletingMoment(m)} className="my-moment__delete" aria-label={`Delete moment: ${m.caption}`}>
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deletingMoment && (
        <Modal title="Delete this moment?" labelId="delete-moment-title" onClose={() => !deleting && setDeletingMoment(null)}>
          <p className="modal__sub">The photo and its likes will be removed. This can't be undone.</p>
          <div className="cm-form-actions cm-delete-actions">
            <button type="button" onClick={() => setDeletingMoment(null)} disabled={deleting} className="cm-text-btn">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn--primary">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="cm-toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
    </>
  )
}
