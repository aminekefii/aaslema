import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import Modal from './Modal.jsx'
import { cities } from '../cities.js'
import { BODY_MIN, PHOTOS_MAX } from '../communityPosts.js'

// New / edit post form and the delete question, shared by the community page and My posts.
// post: { title, cityId, content, tags (the Hashtags field), photos: [{ key, url, path? (saved) | file? (new) }] }

// Photo picker: up to 3, each with a preview and a remove button
function PhotoPicker({ photos, onChange, disabled }) {
  const input = useRef(null)
  const room = PHOTOS_MAX - photos.length

  const pick = (e) => {
    const files = [...(e.target.files ?? [])].slice(0, room)
    // Cleared so picking the same file again still works
    e.target.value = ''
    onChange([...photos, ...files.map((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))])
  }

  const remove = (item) => {
    if (item.file) URL.revokeObjectURL(item.url)
    onChange(photos.filter((p) => p.key !== item.key))
  }

  return (
    <div className="post-picker">
      <span className="post-picker__label">Photos <small>(up to {PHOTOS_MAX})</small></span>
      <div className="post-picker__row">
        {photos.map((p, i) => (
          <div key={p.key} className="post-picker__item">
            <img src={p.url} alt={`Photo ${i + 1}`} />
            <button type="button" onClick={() => remove(p)} disabled={disabled} className="post-picker__remove" aria-label={`Remove photo ${i + 1}`}><X size={14} /></button>
          </div>
        ))}
        {room > 0 && (
          <button type="button" onClick={() => input.current?.click()} disabled={disabled} className="post-picker__add">
            <ImagePlus size={20} />
            <span>Add photo</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={pick} />
    </div>
  )
}

export function PostFormModal({ editing, post, onChange, onSubmit, onClose, saving = false, error = '' }) {
  return (
    <Modal title={editing ? 'Edit post' : 'New post'} labelId="post-dialog-title" onClose={onClose} wide>
      <p className="modal__sub">{editing ? 'Update your post for the community.' : 'Share a tip, question or story with other travellers.'}</p>
      <form onSubmit={onSubmit} className="moment-form">
        <label>
          Title
          <input required type="text" placeholder="e.g. The forgotten ruins of Dougga" value={post.title} onChange={(e) => onChange({ ...post, title: e.target.value })} />
        </label>
        <label>
          City
          <select required value={post.cityId} onChange={(e) => onChange({ ...post, cityId: e.target.value })}>
            <option value="" disabled>Select a city</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          Post
          <textarea required rows={5} placeholder="Write at least 20 characters" value={post.content} onChange={(e) => onChange({ ...post, content: e.target.value })} />
        </label>
        <PhotoPicker photos={post.photos ?? []} onChange={(photos) => onChange({ ...post, photos })} disabled={saving} />
        <label>
          Hashtags
          <input type="text" placeholder="#sahara #roadtrip #food" value={post.tags ?? ''} onChange={(e) => onChange({ ...post, tags: e.target.value })} />
          <small className="moment-form__hint">Up to 5, separated by spaces.</small>
        </label>

        {error && <p className="contact__error" role="alert">{error}</p>}

        <div className="cm-form-actions">
          <button type="button" onClick={onClose} disabled={saving} className="cm-text-btn">Cancel</button>
          <button type="submit" disabled={saving || post.content.trim().length < BODY_MIN} className="btn btn--primary">
            {saving ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Publish post'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function DeletePostModal({ onConfirm, onClose, deleting = false }) {
  return (
    <Modal title="Delete this post?" labelId="delete-dialog-title" onClose={() => !deleting && onClose()}>
      <div className="cm-form-actions cm-delete-actions">
        <button type="button" onClick={onClose} disabled={deleting} className="cm-text-btn">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={deleting} className="btn btn--primary">Delete</button>
      </div>
    </Modal>
  )
}
