import { useEffect, useMemo, useState } from 'react'
import { User, MessageSquare, Heart, Share2, Search, Plus, X, MoreHorizontal, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cities } from '../cities.js'
import { samplePosts } from '../community.js'
import Modal from '../components/Modal.jsx'

// Port of aaslema-new's Community page. Aaslema stores posts, likes and reports in
// Supabase; this template has no backend, so your own posts and likes stay in this browser.
const POSTS_KEY = 'community_posts'
const LIKES_KEY = 'community_likes'
const EMPTY_POST = { title: '', content: '', cityId: '', tags: '', imageUrls: [] }

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full or blocked */ }
}

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

// Shrinks a photo before keeping it, so a few posts fit in browser storage.
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function PostImageSlider({ images }) {
  const [index, setIndex] = useState(0)
  const step = (dir) => setIndex((prev) => (prev + dir + images.length) % images.length)

  return (
    <div className="cm-slider">
      <img src={images[index]} alt="Post photo" loading="lazy" />
      {images.length > 1 && (
        <>
          <button type="button" className="cm-slider__btn cm-slider__btn--prev" onClick={() => step(-1)} aria-label="Previous photo">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="cm-slider__btn cm-slider__btn--next" onClick={() => step(1)} aria-label="Next photo">
            <ChevronRight size={16} />
          </button>
          <span className="cm-slider__count">{index + 1}/{images.length}</span>
        </>
      )}
    </div>
  )
}

export default function Community() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeForum, setActiveForum] = useState('global')
  const [myPosts, setMyPosts] = useState(() => load(POSTS_KEY, []))
  const [likedIds, setLikedIds] = useState(() => new Set(load(LIKES_KEY, [])))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [newPost, setNewPost] = useState(EMPTY_POST)
  const [reportingPost, setReportingPost] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    document.title = 'Community - Aaslema'
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const posts = useMemo(
    () => [...myPosts, ...samplePosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [myPosts],
  )

  const filteredPosts = posts.filter((p) =>
    (activeForum === 'global' || p.cityId === activeForum) &&
    (p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.content.toLowerCase().includes(searchTerm.toLowerCase())),
  )
  const activeCityName = cities.find((c) => c.id === activeForum)?.name

  const openNewPost = () => {
    setEditingPost(null)
    setNewPost({ ...EMPTY_POST, cityId: activeForum === 'global' ? '' : activeForum })
    setIsModalOpen(true)
  }
  const openEditModal = (post) => {
    setEditingPost(post)
    setNewPost({ title: post.title, content: post.content, cityId: post.cityId, tags: post.tags.join(', '), imageUrls: post.imageUrls })
    setIsModalOpen(true)
  }
  const closeModal = () => setIsModalOpen(false)

  const handleLike = (post) => {
    const next = new Set(likedIds)
    next.has(post.id) ? next.delete(post.id) : next.add(post.id)
    setLikedIds(next)
    save(LIKES_KEY, [...next])
  }

  const handleSavePost = (e) => {
    e.preventDefault()
    const fields = {
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      cityId: newPost.cityId,
      cityName: cities.find((c) => c.id === newPost.cityId)?.name || 'Tunisia',
      tags: newPost.tags.split(',').map((t) => t.trim()).filter(Boolean),
      imageUrls: newPost.imageUrls,
    }
    const updated = editingPost
      ? myPosts.map((p) => (p.id === editingPost.id ? { ...p, ...fields } : p))
      : [{ id: `mine-${Date.now()}`, mine: true, userName: 'You', likes: 0, comments: 0, createdAt: new Date().toISOString(), ...fields }, ...myPosts]
    setMyPosts(updated)
    save(POSTS_KEY, updated)
    setIsModalOpen(false)
    setEditingPost(null)
    setNewPost(EMPTY_POST)
    setToast(editingPost ? 'Changes saved' : 'Post published')
  }

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    for (const file of files) {
      try {
        const url = await readPhoto(file)
        setNewPost((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, url].slice(0, 5) }))
      } catch {
        setToast('That photo could not be read. Try a JPG or PNG.')
      }
    }
  }

  const handleReportPost = (e) => {
    e.preventDefault()
    setReportingPost(null)
    setReportReason('')
    setToast('Report received. Thank you for keeping the community safe.')
  }

  const handleShare = async (post) => {
    const url = `${window.location.origin}/community#${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied')
    } catch {
      setToast('Copy failed. Your browser blocked clipboard access.')
    }
  }

  const likesFor = (post) => post.likes + (likedIds.has(post.id) ? 1 : 0)

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

              {filteredPosts.length === 0 ? (
                <div className="cm-card cm-empty">
                  <MessageSquare size={32} />
                  <h3>{searchTerm ? 'No posts match your search' : 'No posts yet'}</h3>
                  <p>{searchTerm ? 'Try another word, or clear the search.' : 'Start the first conversation in this forum.'}</p>
                  <button onClick={openNewPost} className="btn btn--primary"><Plus size={18} /> New post</button>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const liked = likedIds.has(post.id)
                  return (
                    <article key={post.id} id={post.id} className="cm-card cm-post">
                      <div className="cm-post__head">
                        <span className="cm-avatar"><User size={18} /></span>
                        <div className="cm-post__who">
                          <strong>{post.userName}</strong>
                          <small>{post.cityName}, {timeAgo(post.createdAt)}</small>
                        </div>
                        <button onClick={() => setReportingPost(post)} className="cm-icon-btn" title="Report post" aria-label="Report post">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>

                      <h3>{post.title}</h3>
                      <p className="cm-post__text">{post.content}</p>

                      {post.imageUrls.length > 0 && <PostImageSlider images={post.imageUrls} />}

                      {post.tags.length > 0 && (
                        <div className="guide-card__chips">
                          {post.tags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}
                        </div>
                      )}

                      <div className="cm-post__actions">
                        <button onClick={() => handleLike(post)} className={`cm-action ${liked ? 'is-liked' : ''}`} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'}>
                          <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {likesFor(post)}
                        </button>
                        <span className="cm-action cm-action--static"><MessageSquare size={16} /> {post.comments}</span>
                        <button onClick={() => handleShare(post)} className="cm-action" title="Copy post link">
                          <Share2 size={16} /> Share
                        </button>
                        {post.mine && <button onClick={() => openEditModal(post)} className="cm-action cm-action--end">Edit</button>}
                      </div>
                    </article>
                  )
                })
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
        <Modal title={editingPost ? 'Edit post' : 'New post'} labelId="post-dialog-title" onClose={closeModal} wide>
          <p className="modal__sub">{editingPost ? 'Update your post for the community.' : 'Share a tip, question or story with other travellers.'}</p>
          <form onSubmit={handleSavePost} className="moment-form">
            <label>
              Title
              <input required type="text" placeholder="e.g. The forgotten ruins of Dougga" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} />
            </label>
            <div className="cm-form-row">
              <label>
                City
                <select required value={newPost.cityId} onChange={(e) => setNewPost({ ...newPost, cityId: e.target.value })}>
                  <option value="" disabled>Select a city</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>
                Tags
                <input type="text" placeholder="food, hike, solo" value={newPost.tags} onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })} />
              </label>
            </div>
            <label>
              Post
              <textarea required rows={5} placeholder="Write at least 20 characters" value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} />
            </label>

            <div className="cm-photos">
              <span className="cm-photos__label">Photos <small>(up to 5)</small></span>
              <div className="cm-photos__grid">
                {newPost.imageUrls.map((url, i) => (
                  <div key={i} className="cm-photos__item">
                    <img src={url} alt="Preview" />
                    <button type="button" onClick={() => setNewPost({ ...newPost, imageUrls: newPost.imageUrls.filter((_, idx) => idx !== i) })} aria-label="Remove photo">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newPost.imageUrls.length < 5 && (
                  <label className="cm-photos__add" aria-label="Add photos">
                    <Plus size={18} />
                    <input type="file" multiple accept="image/*" hidden onChange={handleAddPhotos} />
                  </label>
                )}
              </div>
            </div>

            <div className="cm-form-actions">
              <button type="button" onClick={closeModal} className="cm-text-btn">Cancel</button>
              <button type="submit" disabled={newPost.content.trim().length < 20} className="btn btn--primary">
                {editingPost ? 'Save changes' : 'Publish post'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Report */}
      {reportingPost && (
        <Modal title="Report post" labelId="report-dialog-title" onClose={() => setReportingPost(null)} wide>
          <p className="modal__sub">Tell us what's wrong with this post. Moderators will review it.</p>
          <form onSubmit={handleReportPost} className="moment-form">
            <textarea required rows={4} placeholder="Why are you reporting this post?" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <div className="cm-form-actions">
              <button type="button" onClick={() => setReportingPost(null)} className="cm-text-btn">Cancel</button>
              <button type="submit" className="btn btn--primary">Submit report</button>
            </div>
          </form>
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
