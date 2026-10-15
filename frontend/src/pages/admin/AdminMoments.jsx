import { useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import { cities } from '../../cities.js'
import { lastSeen } from '../../adminUsers.js'
// Tabs only look at approved_at, so the review helpers fit moments too
import { filterReviews, isPublished, reviewCounts } from '../../adminReviews.js'
import { photoUrls } from '../../momentsApi.js'
import { canApprove } from '../../moments.js'

const tabs = [['pending', 'Pending'], ['published', 'Published'], ['all', 'All']]
const cityName = (id) => cities.find((c) => c.id === id)?.name ?? id

// Tells the sidebar to refresh its pending-moment count
const notifyChanged = () => window.dispatchEvent(new Event('admin:moments-changed'))

export default function AdminMoments() {
  const [moments, setMoments] = useState(null)
  const [urls, setUrls] = useState({})
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pending')

  const load = async () => {
    setError(null)
    setMoments(null)
    try {
      const { data, error } = await supabase.from('moments').select('*').order('created_at', { ascending: false })
      if (error) return setError(error)
      const rows = data ?? []
      setUrls(await photoUrls(rows.map((m) => m.image_path)))
      setMoments(rows)
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Moments - Aaslema Admin'
    load()
  }, [])

  const replace = (updated) => setMoments((list) => list.map((m) => (m.id === updated.id ? updated : m)))
  const remove = (id) => setMoments((list) => list.filter((m) => m.id !== id))

  if (error) {
    return (
      <>
        <h1>Moments</h1>
        {error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load moments: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )}
      </>
    )
  }

  if (moments === null) {
    return <><h1>Moments</h1><p className="admin-note">Loading moments…</p></>
  }

  const counts = reviewCounts(moments)
  const shown = filterReviews(moments, tab)

  return (
    <>
      <h1>Moments</h1>
      <div className="admin-tabs" role="tablist" aria-label="Filter moments">
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
        <p className="admin-note">{tab === 'pending' ? 'No moments waiting for approval.' : 'No moments here.'}</p>
      ) : (
        <ul className="admin-msgs">
          {shown.map((m) => <MomentItem key={m.id} moment={m} url={urls[m.image_path]} onChange={replace} onRemove={remove} />)}
        </ul>
      )}
    </>
  )
}

function MomentItem({ moment, url, onChange, onRemove }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const published = isPublished(moment)

  const act = async (action) => {
    setBusy(true)
    setFailed(false)
    try {
      await action()
      notifyChanged()
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  // .single() errors when no row matched (deleted or approved meanwhile)
  const approve = () => act(async () => {
    const { data, error } = await supabase.from('moments').update({ approved_at: new Date().toISOString() })
      .eq('id', moment.id).is('approved_at', null).select().single()
    if (error) throw error
    onChange(data)
  })

  // A delete that matches no row returns no error, so check it hit one
  const remove = () => act(async () => {
    const { data, error } = await supabase.from('moments').delete().eq('id', moment.id).select('id')
    if (error || !data?.length) throw error ?? new Error('Moment not deleted')
    // The row is gone, so the photo is private and unused; a failed removal only leaves a stray file
    await supabase.storage.from('moments').remove([moment.image_path]).catch(() => {})
    onRemove(moment.id)
  })

  return (
    <li className="admin-msg admin-moment">
      {url ? <img className="admin-moment__photo" src={url} alt={moment.caption} /> : <span className="admin-moment__photo">Photo unavailable</span>}
      <div className="admin-moment__body">
        <div className="admin-review__head">
          <strong>{cityName(moment.city_id)}</strong>
          {moment.spot && <span>· {moment.spot}</span>}
          <span className={`admin-badge ${published ? 'admin-badge--ok' : 'admin-badge--warn'}`}>{published ? 'Published' : 'Pending'}</span>
          <span className="admin-review__date">{lastSeen(moment.created_at)}</span>
        </div>
        <p className="admin-msg__text">{moment.caption}</p>
        <p className="admin-review__by"><strong>{moment.author_name}</strong></p>
        <div className="admin-msg__actions">
          {confirming ? (
            <>
              <span className="admin-review__confirm">Delete this moment?</span>
              <button type="button" className="btn btn--sm admin-btn-danger" disabled={busy} onClick={remove}>Delete</button>
              <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
            </>
          ) : (
            <>
              {!published && (
                <button type="button" className="btn btn--primary btn--sm" disabled={busy || !canApprove(moment, url)} onClick={approve} title={url ? undefined : "The photo is missing, so this moment can't be approved"}>
                  Approve
                </button>
              )}

              <button type="button" className="btn btn--sm admin-btn-outline" disabled={busy} onClick={() => setConfirming(true)}>Delete</button>
            </>
          )}
        </div>
        {failed && <p className="admin-note--error admin-msg__error">Couldn't update this moment. Try again.</p>}
      </div>
    </li>
  )
}
