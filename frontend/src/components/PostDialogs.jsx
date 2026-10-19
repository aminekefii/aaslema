import Modal from './Modal.jsx'
import { cities } from '../cities.js'
import { BODY_MIN } from '../communityPosts.js'

// New / edit post form and the delete question, shared by the community page and My posts.

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

        {error && <p className="contact__error" role="alert">{error}</p>}

        <div className="cm-form-actions">
          <button type="button" onClick={onClose} disabled={saving} className="cm-text-btn">Cancel</button>
          <button type="submit" disabled={saving || post.content.trim().length < BODY_MIN} className="btn btn--primary">
            {editing ? 'Save changes' : 'Publish post'}
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
