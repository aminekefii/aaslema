import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { lastSeen } from '../../adminUsers.js'
import { fetchPostReports } from '../../communityApi.js'

// Reports users sent about community posts, newest first. Read only for now.
export default function AdminPostReports() {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState(null)
  const [showSoon, setShowSoon] = useState(false)

  const load = async () => {
    setError(null)
    setReports(null)
    const result = await fetchPostReports()
    if (result.error) setError(result.error)
    else setReports(result.reports)
  }

  useEffect(() => {
    document.title = 'Post reports - Aaslema Admin'
    load()
  }, [])

  if (error) {
    return (
      <>
        <h1>Post reports</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load reports{error.message ? `: ${error.message}` : '.'}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (reports === null) {
    return <><h1>Post reports</h1><p className="admin-note">Loading reports…</p></>
  }

  return (
    <>
      <h1>Post reports</h1>
      {reports.length === 0 ? (
        <p className="admin-note">No reports yet.</p>
      ) : (
        <ul className="admin-msgs">
          {reports.map((r) => (
            <li key={r.id} className="admin-msg admin-review">
              <div className="admin-review__head">
                <strong className="admin-report__by">{r.reporter_name}</strong>
                <span className="admin-review__date">{lastSeen(r.created_at)}</span>
              </div>
              <p className="admin-review__by">About: <strong>{r.post_title}</strong></p>
              <p className="admin-msg__text">{r.reason}</p>
              <div className="admin-msg__actions">
                <button type="button" className="btn btn--sm admin-btn-outline" onClick={() => setShowSoon(true)}>
                  <Eye size={16} /> See post
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Opening the reported post comes later */}
      {showSoon && (
        <Modal title="See post" labelId="see-post-title" onClose={() => setShowSoon(false)}>
          <p className="cm-soon"><Eye size={20} /> Coming soon</p>
          <p className="modal__sub">Soon you'll be able to open the reported post from here.</p>
          <button type="button" className="btn btn--primary moment-review__close" onClick={() => setShowSoon(false)}>Close</button>
        </Modal>
      )}
    </>
  )
}
