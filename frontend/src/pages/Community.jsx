import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Heart, Search, Plus, MoreHorizontal, CheckCircle2, SlidersHorizontal, X } from 'lucide-react'
import { cities } from '../cities.js'
import Modal from '../components/Modal.jsx'
import { initials } from '../names.js'
import { photoChanges, postFromForm, postHasTag, postMatches, tagFilterText, reportFromForm, savedPhotoItems, sortPosts, tagsText } from '../communityPosts.js'
import { DeletePostModal, PostFormModal } from '../components/PostDialogs.jsx'
import PostComments from '../components/PostComments.jsx'
import { AuthorButton, useProfileCard } from '../components/ProfileCard.jsx'
import { PostPhotos, PostTags } from '../components/PostMedia.jsx'
import { createPost, deletePost, fetchFeed, reportPost, setPostLike, updatePost } from '../communityApi.js'
import { toggleMomentLike } from '../moments.js'

// Port of aaslema-new's Community page. Everyone sees the saved posts from Supabase; visitors
// (/community) are sent to sign in to post, like or report, signed-in users (/app/community) do it here.
const EMPTY_POST = { title: '', content: '', cityId: '', tags: '', photos: [] }
// [value for sortPosts, label]
const SORTS = [['latest', 'Latest'], ['oldest', 'Oldest'], ['liked', 'Most liked']]
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
  title: r.title, content: r.body, cityId: r.city_id, likes: r.likes, liked: r.liked, mine: r.mine, comments: r.comments,
  photos: r.photos, photoUrls: r.photo_urls, tags: r.tags,
})

export default function Community({ user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeForum, setActiveForum] = useState('global')
  const [sort, setSort] = useState('latest')
  // Sidebar Hashtag field: typed, or filled by clicking a hashtag on a post ('' for none)
  const [tag, setTag] = useState('')
  const activeTag = tagFilterText(tag)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [newPost, setNewPost] = useState(EMPTY_POST)
  const [reportingPost, setReportingPost] = useState(null)
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
  // Posts whose comments are open
  const [openComments, setOpenComments] = useState(() => new Set())
  // Signed in: clicking an author opens their public card
  const { openCard, cardDialog } = useProfileCard(user)

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

  // Opened from a landing page story (/community#<post id>): scroll to that post once the posts are in
  const scrolledToHash = useRef(false)
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!feed || !id || scrolledToHash.current) return
    scrolledToHash.current = true
    document.getElementById(id)?.scrollIntoView({ block: 'center' })
  }, [feed])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const posts = (feed ?? []).map(feedCard)

  const filteredPosts = sortPosts(posts.filter((p) =>
    (activeForum === 'global' || p.cityId === activeForum) &&
    postHasTag(p, tag) &&
    postMatches(p, searchTerm),
  ), sort)
  const sortLabel = SORTS.find(([value]) => value === sort)[1]
  const filtered = activeForum !== 'global' || sort !== 'latest' || activeTag !== ''
  const resetFilters = () => {
    setActiveForum('global')
    setSort('latest')
    setTag('')
  }
  // Every hashtag in the loaded posts, for the field's suggestions
  const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort()
  // Clicking the active hashtag again clears it
  const pickTag = (t) => setTag((now) => (tagFilterText(now) === t ? '' : `#${t}`))
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
    setNewPost({ title: post.title, content: post.content, cityId: post.cityId, tags: tagsText(post.tags), photos: savedPhotoItems(post.photos, post.photoUrls) })
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

  const toggleComments = (id) => setOpenComments((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const changeCommentCount = (id, delta) =>
    setFeed((prev) => prev?.map((p) => (p.id === id ? { ...p, comments: p.comments + delta } : p)))

  const handleSavePost = async (e) => {
    e.preventDefault()
    if (saving) return
    const { row, error } = postFromForm(newPost, user)
    if (error) return setFormError(error)
    setSaving(true)
    setFormError('')
    const result = editingPost
      ? await updatePost(editingPost.id, row, { userId: user.id, ...photoChanges(newPost.photos, editingPost.photos) })
      : await createPost(row, { userId: user.id, files: photoChanges(newPost.photos).files })
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
    const result = await deletePost(deletingPost.id, deletingPost.photos)
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

          <div className="cm-layout">
            {/* Sidebar */}
            <aside className="cm-sidebar">
              <div className="cm-card cm-filters">
                <div className="cm-filters__head">
                  <h3><SlidersHorizontal size={16} /> Filters</h3>
                  {filtered && <button onClick={resetFilters} className="cm-filters__reset">Reset</button>}
                </div>
                <label className="cm-filters__group">
                  <span className="cm-filters__label">Location</span>
                  <select value={activeForum} onChange={(e) => setActiveForum(e.target.value)}>
                    <option value="global">All of Tunisia</option>
                    {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                </label>
                <div className="cm-filters__group">
                  <label htmlFor="cm-tag" className="cm-filters__label">Hashtag</label>
                  <div className="cm-filters__tag-field">
                    <input id="cm-tag" type="text" list="cm-tag-list" placeholder="#sahara" autoComplete="off" value={tag} onChange={(e) => setTag(e.target.value)} />
                    {tag && (
                      <button type="button" onClick={() => setTag('')} className="cm-filters__clear" aria-label="Clear the hashtag filter"><X size={14} /></button>
                    )}
                  </div>
                  <datalist id="cm-tag-list">
                    {allTags.map((t) => <option key={t} value={`#${t}`} />)}
                  </datalist>
                </div>
                <fieldset className="cm-filters__group">
                  <legend className="cm-filters__label">Sort by</legend>
                  {SORTS.map(([value, label]) => (
                    <label key={value} className="cm-filters__option">
                      <input type="radio" name="cm-sort" value={value} checked={sort === value} onChange={() => setSort(value)} />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </div>

              <div className="cm-card cm-about">
                <h3>About the forum</h3>
                <dl>
                  <div><dt>Posts</dt><dd>{posts.length}</dd></div>
                  <div><dt>City forums</dt><dd>{cities.length}</dd></div>
                </dl>
                <button onClick={openNewPost} className="cm-outline-btn">Share a spot</button>
              </div>
            </aside>

            {/* Feed */}
            <div className="cm-feed">
              <h2 className="cm-feed__title">{sortLabel} posts{activeForum === 'global' ? '' : ` in ${activeCityName}`}{activeTag ? ` tagged #${activeTag}` : ''}</h2>

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
                      <AuthorButton name={post.userName} onOpen={openCard && (() => openCard('post', post.id, post.userName))} className="cm-post__author">
                        {post.avatarUrl
                          ? <img src={post.avatarUrl} alt="" className="cm-avatar" loading="lazy" />
                          : <span className="cm-avatar cm-avatar--initials" aria-hidden="true">{initials(post.userName)}</span>}
                        <div className="cm-post__who">
                          <strong>{post.userName}</strong>
                          <small>{timeAgo(post.createdAt)}</small>
                        </div>
                      </AuthorButton>
                      {/* Nobody reports their own posts */}
                      {!post.mine && (
                        <button onClick={() => openReport(post)} className="cm-icon-btn" title="Report post" aria-label="Report post">
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>

                    <h3>{post.title}</h3>
                    <p className="cm-post__text">{post.content}</p>
                    <PostPhotos urls={post.photoUrls} title={post.title} />
                    <PostTags tags={post.tags} onTag={pickTag} active={activeTag} />

                    <div className="cm-post__actions">
                      <button onClick={() => handleLike(post)} aria-disabled={likesSaving.has(post.id)} className={`cm-action ${post.liked ? 'is-liked' : ''}`} aria-pressed={post.liked} aria-label={post.liked ? 'Unlike' : 'Like'}>
                        <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                      </button>
                      <button onClick={() => toggleComments(post.id)} className={`cm-action ${openComments.has(post.id) ? 'is-open' : ''}`} aria-expanded={openComments.has(post.id)} aria-label={`Comments (${post.comments})`}>
                        <MessageSquare size={16} /> {post.comments}
                      </button>
                      {post.mine && <button onClick={() => openEditModal(post)} className="cm-action cm-action--end">Edit</button>}
                      {post.mine && <button onClick={() => setDeletingPost(post)} className="cm-action">Delete</button>}
                    </div>

                    {openComments.has(post.id) && (
                      <PostComments postId={post.id} user={user} onCountChange={(delta) => changeCommentCount(post.id, delta)} openCard={openCard} />
                    )}
                  </article>
                ))
              )}
            </div>
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

      {cardDialog}

      {toast && (
        <div className="cm-toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
    </>
  )
}
