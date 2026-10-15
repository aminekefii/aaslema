import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { supabase } from '../../supabase.js'
import { lastSeen } from '../../adminUsers.js'
import { filterByStatus, isHandled, messageCounts, messagePreview, replyHref } from '../../adminMessages.js'

const tabs = [['new', 'New'], ['handled', 'Handled'], ['all', 'All']]

// Tells the sidebar to refresh its new-message count
const notifyChanged = () => window.dispatchEvent(new Event('admin:messages-changed'))

export default function AdminMessages() {
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('new')
  const [openId, setOpenId] = useState(null)

  const load = async () => {
    setError(null)
    setMessages(null)
    try {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
      if (error) setError(error)
      else setMessages(data ?? [])
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Messages - Aaslema Admin'
    load()
  }, [])

  const replace = (updated) => setMessages((list) => list.map((m) => (m.id === updated.id ? updated : m)))

  if (error) {
    return (
      <>
        <h1>Messages</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load messages: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (messages === null) {
    return <><h1>Messages</h1><p className="admin-note">Loading messages…</p></>
  }

  const counts = messageCounts(messages)
  const shown = filterByStatus(messages, tab)

  return (
    <>
      <h1>Messages</h1>
      <div className="admin-tabs" role="tablist" aria-label="Filter messages">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="admin-note">{tab === 'new' ? 'No new messages.' : 'No messages here.'}</p>
      ) : (
        <ul className="admin-msgs">
          {shown.map((m) => (
            <MessageItem
              key={m.id}
              message={m}
              open={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              onChange={replace}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function MessageItem({ message, open, onToggle, onChange }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const handled = isHandled(message)

  const toggleStatus = async () => {
    setBusy(true)
    setFailed(false)
    const handled_at = handled ? null : new Date().toISOString()
    try {
      const { error } = await supabase.from('contact_messages').update({ handled_at }).eq('id', message.id)
      if (error) throw error
      onChange({ ...message, handled_at })
      notifyChanged()
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  return (
    <li className={`admin-msg ${open ? 'admin-msg--open' : ''}`}>
      <button type="button" className="admin-msg__head" onClick={onToggle} aria-expanded={open}>
        <span className="admin-msg__from"><strong>{message.name}</strong> {message.email}</span>
        <span className="admin-msg__preview">{messagePreview(message)}</span>
        <span className="admin-msg__meta">
          {message.user_id && <span className="admin-badge admin-badge--ok">Signed-in user</span>}
          {lastSeen(message.created_at)}
        </span>
      </button>

      {open && (
        <div className="admin-msg__body">
          {message.subject && <h3>{message.subject}</h3>}
          <p className="admin-msg__text">{message.message}</p>
          <p className="admin-msg__date">Received {new Date(message.created_at).toLocaleString()}</p>
          <div className="admin-msg__actions">
            <a href={replyHref(message)} className="btn btn--primary btn--sm"><Mail size={14} /> Reply</a>
            <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={toggleStatus}>
              {handled ? 'Mark as new' : 'Mark handled'}
            </button>
          </div>
          {failed && <p className="admin-note--error admin-msg__error">Couldn't update this message. Try again.</p>}
        </div>
      )}
    </li>
  )
}
