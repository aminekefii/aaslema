import { useEffect, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal.jsx'
import { PostPhotos, PostTags } from '../../components/PostMedia.jsx'
import { cities } from '../../cities.js'
import { lastSeen } from '../../adminUsers.js'
import { adminDeletePost, fetchPostReports, fetchReportedPost } from '../../communityApi.js'

const cityName = (id) => cities.find((c) => c.id === id)?.name ?? id

// Reports users sent about community posts, newest first. Admins open the reported post and can delete it.
export default function AdminPostReports() {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState(null)
  // The post open in the dialog: { postId, post (undefined while loading, null if gone), error }
  const [viewing, setViewing] = useState(null)

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

  const openPost = async (postId) => {
    setViewing({ postId })
    const result = await fetchReportedPost(postId)
    // Ignore a late answer for a dialog that was closed or switched to another post
    setViewing((v) => (v?.postId === postId ? { postId, ...result } : v))
  }

  // A deleted post takes all its reports with it
  const removed = (postId) => {
    setReports((list) => list.filter((r) => r.post_id !== postId))
    setViewing((v) => (v?.postId === postId ? null : v))
  }

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
              <DeletePostActions postId={r.post_id} onDeleted={removed}>
                <button type="button" className="btn btn--sm admin-btn-outline" onClick={() => openPost(r.post_id)}>
                  <Eye size={16} /> See post
                </button>
              </DeletePostActions>
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <Modal title="Reported post" labelId="see-post-title" onClose={() => setViewing(null)} wide>
          <ReportedPost viewing={viewing} onDeleted={removed} onRetry={() => openPost(viewing.postId)} />
        </Modal>
      )}
    </>
  )
}

function ReportedPost({ viewing, onDeleted, onRetry }) {
  const { postId, post, error } = viewing

  if (error) {
    return (
      <p className="admin-note admin-note--error">
        {error.code === '42501' ? "Your session doesn't have admin rights yet. Sign out and sign in again." : "Couldn't load this post."}
        {error.code !== '42501' && <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>Try again</button>}
      </p>
    )
  }
  if (post === undefined) return <p className="admin-note">Loading post…</p>
  if (post === null) return <p className="admin-note">This post was already deleted.</p>

  return (
    <article className="admin-post">
      <p className="modal__sub">
        <strong className="admin-report__by">{post.author_name}</strong> · {cityName(post.city_id)} · {lastSeen(post.created_at)}
      </p>
      <h3 className="admin-post__title">{post.title}</h3>
      <p className="admin-msg__text">{post.body}</p>
      <PostPhotos urls={post.photo_urls} title={post.title} />
      <PostTags tags={post.tags} />
      <DeletePostActions postId={postId} onDeleted={onDeleted} />
    </article>
  )
}

// Delete post button with an inline "are you sure"; children are extra buttons shown beside it
function DeletePostActions({ postId, onDeleted, children = null }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')

  const remove = async () => {
    setBusy(true)
    setFailed('')
    const result = await adminDeletePost(postId)
    setBusy(false)
    if (result.error) setFailed(result.error)
    else onDeleted(postId)
  }

  return (
    <>
      <div className="admin-msg__actions">
        {confirming ? (
          <>
            <span className="admin-review__confirm">Delete this post and all its reports?</span>
            <button type="button" className="btn btn--sm admin-btn-danger" disabled={busy} onClick={remove}>Delete</button>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <>
            {children}
            <button type="button" className="btn btn--sm admin-btn-outline" onClick={() => setConfirming(true)}>
              <Trash2 size={16} /> Delete post
            </button>
          </>
        )}
      </div>
      {failed && <p className="admin-note--error admin-msg__error">{failed}</p>}
    </>
  )
}
