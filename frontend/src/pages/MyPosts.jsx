import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Heart, MapPin } from 'lucide-react'
import { cities } from '../cities.js'
import { myPostCard, postFromForm } from '../communityPosts.js'
import { deletePost, fetchMyPosts, updatePost } from '../communityApi.js'
import { DeletePostModal, PostFormModal } from '../components/PostDialogs.jsx'
import { timeAgo } from '../timeAgo.js'

// Profile dashboard: every community post the user published, with likes; edit and delete here too.
export default function MyPosts({ user }) {
  // undefined while loading, null if loading failed
  const [posts, setPosts] = useState(undefined)
  const [editingPost, setEditingPost] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingPost, setDeletingPost] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setPosts(undefined)
    const rows = await fetchMyPosts()
    setPosts(rows && rows.map((r) => myPostCard(r, cities)))
  }, [])

  useEffect(() => {
    document.title = 'My posts - Aaslema'
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const openEdit = (post) => {
    setEditingPost(post)
    setForm({ title: post.title, cityId: post.cityId, content: post.content })
    setFormError('')
  }
  const closeEdit = () => {
    if (!saving) setEditingPost(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (saving) return
    const { row, error } = postFromForm(form, user)
    if (error) return setFormError(error)
    setSaving(true)
    setFormError('')
    const result = await updatePost(editingPost.id, row)
    setSaving(false)
    if (result.error) return setFormError(result.error)
    // Saved: show the change here without reloading the list
    const changed = myPostCard({ id: editingPost.id, city_id: row.city_id, title: row.title, body: row.body, created_at: editingPost.postedAt, likes: editingPost.likes }, cities)
    setPosts((prev) => prev?.map((p) => (p.id === editingPost.id ? changed : p)))
    setEditingPost(null)
    setToast('Changes saved')
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deletePost(deletingPost.id)
    setDeleting(false)
    if (!result.error) setPosts((prev) => prev?.filter((p) => p.id !== deletingPost.id))
    setDeletingPost(null)
    setToast(result.error ?? 'Post deleted')
  }

  return (
    <>
      <h1>My posts</h1>
      <p className="profile-card__lead">Posts you published in the community.</p>
      {posts === undefined && <p className="profile-note">Loading your posts…</p>}
      {posts === null && (
        <p className="profile-note profile-note--error my-moments__error" role="alert">
          Couldn't load your posts.
          <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
        </p>
      )}
      {posts?.length === 0 && (
        <p className="profile-note">You haven't published any posts yet. <a href="/app/community">Go to Community</a></p>
      )}
      {posts?.length > 0 && (
        <div className="my-posts">
          {posts.map((post) => (
            <article key={post.id} className="cm-card cm-post my-post">
              <h3>{post.title}</h3>
              <p className="my-post__meta">
                <MapPin size={14} aria-hidden="true" /> {post.cityName} · <time dateTime={post.postedAt}>{timeAgo(post.postedAt)}</time>
              </p>
              <p className="my-post__text">{post.content}</p>
              <div className="cm-post__actions">
                <span className="cm-action cm-action--static" aria-label={`${post.likes} likes`}>
                  <Heart size={16} aria-hidden="true" /> {post.likes}
                </span>
                <button type="button" onClick={() => openEdit(post)} className="cm-action cm-action--end">Edit</button>
                <button type="button" onClick={() => setDeletingPost(post)} className="cm-action">Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingPost && (
        <PostFormModal editing post={form} onChange={setForm} onSubmit={handleSave} onClose={closeEdit} saving={saving} error={formError} />
      )}

      {deletingPost && <DeletePostModal onConfirm={handleDelete} onClose={() => setDeletingPost(null)} deleting={deleting} />}

      {toast && (
        <div className="cm-toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
    </>
  )
}
