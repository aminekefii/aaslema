import { useCallback, useEffect, useState } from 'react'
import { commentFromForm, COMMENT_MAX } from '../communityPosts.js'
import { createComment, deleteComment, fetchComments } from '../communityApi.js'
import { initials } from '../names.js'
import { timeAgo } from '../timeAgo.js'

// Comments under one community post: everyone reads them, signed-in users write and delete their own.
// onCountChange(+1 / -1) keeps the post's comment count in step.
export default function PostComments({ postId, user, onCountChange }) {
  // undefined while loading, null if loading failed
  const [comments, setComments] = useState(undefined)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // The comment waiting for "Delete?" Yes / No, and the one being deleted
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setComments(undefined)
    setComments(await fetchComments(postId))
  }, [postId])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    const { row, error: formError } = commentFromForm(text, user)
    if (formError) return setError(formError)
    setSending(true)
    setError('')
    const result = await createComment(postId, row)
    if (result.error) {
      setSending(false)
      return setError(result.error)
    }
    const rows = await fetchComments(postId)
    if (rows) setComments(rows)
    setSending(false)
    setText('')
    onCountChange(1)
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    const result = await deleteComment(id)
    setDeletingId(null)
    setConfirmId(null)
    if (result.error) return setError(result.error)
    setComments((prev) => prev?.filter((c) => c.id !== id))
    onCountChange(-1)
  }

  return (
    <div className="cm-comments">
      {comments === undefined ? (
        <p className="cm-comments__note">Loading comments…</p>
      ) : comments === null ? (
        <p className="cm-comments__note cm-comments__note--error" role="alert">
          Couldn't load comments. <button type="button" onClick={load} className="cm-comments__link">Try again</button>
        </p>
      ) : comments.length === 0 ? (
        <p className="cm-comments__note">No comments yet. {user ? 'Be the first to reply.' : ''}</p>
      ) : (
        <ul className="cm-comments__list">
          {comments.map((c) => (
            <li key={c.id} className="cm-comment">
              {c.author_avatar_url
                ? <img src={c.author_avatar_url} alt="" className="cm-avatar cm-avatar--sm" loading="lazy" />
                : <span className="cm-avatar cm-avatar--sm cm-avatar--initials" aria-hidden="true">{initials(c.author_name)}</span>}
              <div className="cm-comment__body">
                <p className="cm-comment__head">
                  <strong>{c.author_name}</strong>
                  <time dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
                </p>
                <p className="cm-comment__text">{c.body}</p>
                {c.mine && (confirmId === c.id ? (
                  <p className="cm-comment__confirm">
                    Delete this comment?
                    <button type="button" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="cm-comments__link">Delete</button>
                    <button type="button" onClick={() => setConfirmId(null)} disabled={deletingId === c.id} className="cm-comments__link cm-comments__link--muted">Keep</button>
                  </p>
                ) : (
                  <button type="button" onClick={() => setConfirmId(c.id)} className="cm-comments__link cm-comments__link--muted">Delete</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="cm-comments__form">
          <label className="sr-only" htmlFor={`comment-${postId}`}>Write a comment</label>
          <textarea
            id={`comment-${postId}`}
            rows={2}
            maxLength={COMMENT_MAX}
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="cm-comments__note cm-comments__note--error" role="alert">{error}</p>}
          <button type="submit" disabled={sending || !text.trim()} className="btn btn--primary btn--sm">
            {sending ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="cm-comments__note"><a href="/signin" className="cm-comments__link">Sign in</a> to leave a comment.</p>
      )}
    </div>
  )
}
