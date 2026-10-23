import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Heart, Share2, Search, Plus, MoreHorizontal, CheckCircle2 } from 'lucide-react'
import { cities } from '../cities.js'
import Modal from '../components/Modal.jsx'
import { initials } from '../names.js'
import { postFromForm, reportFromForm } from '../communityPosts.js'
import { DeletePostModal, PostFormModal } from '../components/PostDialogs.jsx'
import { createPost, deletePost, fetchFeed, reportPost, setPostLike, updatePost } from '../communityApi.js'
import { toggleMomentLike } from '../moments.js'

// Port of aaslema-new's Community page. Everyone sees the saved posts from Supabase; visitors
// (/community) are sent to sign in to post, like or report, signed-in users (/app/community) do it here.
const EMPTY_POST = { title: '', content: '', cityId: '' }
const toSignIn = () => window.location.assign('/signin')

function timeAgo(iso) {
  if (!iso) return 'Just now'
  const date = new Date(iso)
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return date.toLocaleDateString()
}

// A community_feed() row → the card fields the visitor posts already use
const feedCard = (r) => ({
  id: r.id, userName: r.author_name, avatarUrl: r.author_avatar_url, createdAt: r.created_at,
  title: r.title, content: r.body, cityId: r.city_id, likes: r.likes, liked: r.liked, mine: r.mine,
})

export default function Community({ user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeForum, setActiveForum] = useState('global')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [newPost, setNewPost] = useState(EMPTY_POST)
  const [reportingPost, setReportingPost] = useState(null)
  const [showShare, setShowShare] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [toast, setToast] = useState(null)
  // The saved feed (null when it failed); signed in only: likes being saved, form and delete state
  const [feed, setFeed] = useState(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [likesSaving, setLikesSaving] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingPost, setDeletingPost] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    setFeed(await fetchFeed())
    setFeedLoading(false)
  }, [])

  // After publishing or editing: refresh without the loading state; keep the old list if it fails
  const refreshFeed = async () => {
    const rows = await fetchFeed()
    if (rows) setFeed(rows)
  }

  useEffect(() => {
    document.title = 'Community - Aaslema'
  }, [])

  // A token refresh brings a new user object; load once per sign-in, not on every refresh
  const signedIn = Boolean(user)
  useEffect(() => {
    loadFeed()
  }, [signedIn, loadFeed])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const posts = (feed ?? []).map(feedCard)

  const filteredPosts = posts.filter((p) =>
    (activeForum === 'global' || p.cityId === activeForum) &&
    (p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.content.toLowerCase().includes(searchTerm.toLowerCase())),
  )
  const activeCityName = cities.find((c) => c.id === activeForum)?.name

  const openNewPost = () => {
    if (!user) return toSignIn()
    setEditingPost(null)
    setNewPost({ ...EMPTY_POST, cityId: activeForum === 'global' ? '' : activeForum })
    setFormError('')
    setIsModalOpen(true)
  }
  const openEditModal = (post) => {
    setEditingPost(post)
    setNewPost({ title: post.title, content: post.content, cityId: post.cityId })
    setFormError('')
    setIsModalOpen(true)
  }
  const closeModal = () => {
    if (!saving) setIsModalOpen(false)
  }

  // Flips straight away; a failed save flips that post back
  const handleLike = async (post) => {
    if (!user) return toSignIn()
    if (likesSaving.has(post.id)) return
    const flip = () => setFeed((prev) => prev?.map((p) => (p.id === post.id ? toggleMomentLike(p) : p)))
    setLikesSaving((prev) => new Set(prev).add(post.id))
    flip()
    const ok = await setPostLike(post.id, !post.liked)
    if (!ok) {
      flip()
      setToast("Couldn't save your like. Please try again.")
    }
    setLikesSaving((prev) => {
      const next = new Set(prev)
      next.delete(post.id)
      return next
    })
  }

  const handleSavePost = async (e) => {
    e.preventDefault()
    if (saving) return
    const { row, error } = postFromForm(newPost, user)
    if (error) return setFormError(error)
    setSaving(true)
    setFormError('')
    const result = editingPost ? await updatePost(editingPost.id, row) : await createPost(row)
    setSaving(false)
    if (result.error) return setFormError(result.error)
    setIsModalOpen(false)
    setEditingPost(null)
    setNewPost(EMPTY_POST)
    setToast(editingPost ? 'Changes saved' : 'Post published')
    refreshFeed()
  }

  const handleDeletePost = async () => {
    setDeleting(true)
    const result = await deletePost(deletingPost.id)
    setDeleting(false)
    if (!result.error) setFeed((prev) => prev?.filter((p) => p.id !== deletingPost.id))
    setDeletingPost(null)
    setToast(result.error ?? 'Post deleted')
  }

  const openReport = (post) => {
    if (!user) return toSignIn()
    setReportingPost(post)
    setReportReason('')
    setReportError('')
  }
  const closeReport = () => {
    if (!reporting) setReportingPost(null)
  }

  // Saved for the admins' Post reports page
  const handleReportPost = async (e) => {
    e.preventDefault()
    if (reporting) return
    const { row, error } = reportFromForm(reportReason)
    if (error) return setReportError(error)
    setReporting(true)
    setReportError('')
    const result = await reportPost(reportingPost.id, row)
    setReporting(false)
    if (result.error) return setReportError(result.error)
    setReportingPost(null)
    setReportReason('')
    setToast('Report received. Thank you for keeping the community safe.')
  }

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Community</h1>
          <p>Ask questions, share tips and swap stories with other travellers in Tunisia.</p>
        </div>
      </section>

      <section className="section cm">
        <div className="container">
          {/* Search + filters */}
          <div className="cm-toolbar">
            <label className="guide__search cm-search">
              <span className="sr-only">Search posts</span>
              <Search size={16} />
              <input
                type="search"
                placeholder={`Search ${activeForum === 'global' ? 'all posts' : `in ${activeCityName}`}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <button onClick={openNewPost} className="btn btn--primary"><Plus size={18} /> New post</button>
          </div>

          <div className="cm-pills" role="group" aria-label="Filter by city">
            <button onClick={() => setActiveForum('global')} className={activeForum === 'global' ? 'is-active' : ''} aria-pressed={activeForum === 'global'}>All</button>
            {cities.map((city) => (
              <button key={city.id} onClick={() => setActiveForum(city.id)} className={activeForum === city.id ? 'is-active' : ''} aria-pressed={activeForum === city.id}>
                {city.name}
              </button>
            ))}
          </div>

          <div className="cm-layout">
            {/* Feed */}
            <div className="cm-feed">
              <h2 className="cm-feed__title">{activeForum === 'global' ? 'Latest posts' : `Latest in ${activeCityName}`}</h2>

              {feedLoading ? (
                <div className="cm-card cm-empty"><p>Loading posts…</p></div>
              ) : !feed ? (
                <div className="cm-card cm-empty">
                  <MessageSquare size={32} />
                  <h3>Couldn't load posts.</h3>
                  <button onClick={loadFeed} className="btn btn--primary">Try again</button>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="cm-card cm-empty">
                  <MessageSquare size={32} />
                  <h3>{searchTerm ? 'No posts match your search' : 'No posts yet'}</h3>
                  <p>{searchTerm ? 'Try another word, or clear the search.' : 'Start the first conversation in this forum.'}</p>
                  <button onClick={openNewPost} className="btn btn--primary"><Plus size={18} /> New post</button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <article key={post.id} id={post.id} className="cm-card cm-post">
                    <div className="cm-post__head">
                      {post.avatarUrl
                        ? <img src={post.avatarUrl} alt="" className="cm-avatar" loading="lazy" />
                        : <span className="cm-avatar cm-avatar--initials" aria-hidden="true">{initials(post.userName)}</span>}
                      <div className="cm-post__who">
                        <strong>{post.userName}</strong>
                        <small>{timeAgo(post.createdAt)}</small>
                      </div>
                      {/* Nobody reports their own posts */}
                      {!post.mine && (
                        <button onClick={() => openReport(post)} className="cm-icon-btn" title="Report post" aria-label="Report post">
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>

                    <h3>{post.title}</h3>
                    <p className="cm-post__text">{post.content}</p>

                    <div className="cm-post__actions">
                      <button onClick={() => handleLike(post)} aria-disabled={likesSaving.has(post.id)} className={`cm-action ${post.liked ? 'is-liked' : ''}`} aria-pressed={post.liked} aria-label={post.liked ? 'Unlike' : 'Like'}>
                        <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                      </button>
                      <button onClick={() => setShowShare(true)} className="cm-action">
                        <Share2 size={16} /> Share
                      </button>
                      {post.mine && <button onClick={() => openEditModal(post)} className="cm-action cm-action--end">Edit</button>}
                      {post.mine && <button onClick={() => setDeletingPost(post)} className="cm-action">Delete</button>}
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Sidebar */}
            <aside className="cm-sidebar">
              <div className="cm-card cm-about">
                <h3>About the forum</h3>
                <dl>
                  <div><dt>Posts</dt><dd>{posts.length}</dd></div>
                  <div><dt>City forums</dt><dd>{cities.length}</dd></div>
                </dl>
                <button onClick={openNewPost} className="cm-outline-btn">Share a spot</button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* New / edit post */}
      {isModalOpen && (
        <PostFormModal
          editing={Boolean(editingPost)}
          post={newPost}
          onChange={setNewPost}
          onSubmit={handleSavePost}
          onClose={closeModal}
          saving={saving}
          error={formError}
        />
      )}

      {/* Report */}
      {reportingPost && (
        <Modal title="Report post" labelId="report-dialog-title" onClose={closeReport} wide>
          <p className="modal__sub">Tell us what's wrong with this post. Moderators will review it.</p>
          <form onSubmit={handleReportPost} className="moment-form">
            <textarea required rows={4} placeholder="Why are you reporting this post?" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            {reportError && <p className="contact__error" role="alert">{reportError}</p>}
            <div className="cm-form-actions">
              <button type="button" onClick={closeReport} disabled={reporting} className="cm-text-btn">Cancel</button>
              <button type="submit" disabled={reporting} className="btn btn--primary">Submit report</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete your own saved post */}
      {deletingPost && (
        <DeletePostModal onConfirm={handleDeletePost} onClose={() => setDeletingPost(null)} deleting={deleting} />
      )}

      {/* Sharing isn't live yet */}
      {showShare && (
        <Modal title="Share post" labelId="share-dialog-title" onClose={() => setShowShare(false)}>
          <p className="cm-soon"><Share2 size={20} /> Coming soon</p>
          <p className="modal__sub">Soon you'll be able to share posts with your friends.</p>
          <button type="button" className="btn btn--primary moment-review__close" onClick={() => setShowShare(false)}>Close</button>
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
