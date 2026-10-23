import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, MapPin, Navigation, SlidersHorizontal } from 'lucide-react'
import { cities } from '../cities.js'
import { feedMomentCard } from '../moments.js'
import { fetchFeedMoments } from '../momentsApi.js'
import { fetchFeed } from '../communityApi.js'
import { initials } from '../names.js'
import { timeAgo } from '../timeAgo.js'

const POSTS_SHOWN = 10
// Sidebar choice: [value, label]
const SHOW = [['all', 'Everything'], ['moments', 'Moments'], ['posts', 'Posts']]

// Feed at /app: newest shared moments and community posts, view only. Each part loads on its own.
export default function AppHome() {
  // undefined while loading, null if loading failed
  const [moments, setMoments] = useState(undefined)
  const [posts, setPosts] = useState(undefined)
  const [show, setShow] = useState('all')

  const loadMoments = useCallback(async () => {
    setMoments(undefined)
    const rows = await fetchFeedMoments()
    setMoments(rows && rows.map((r) => feedMomentCard(r, cities)))
  }, [])

  const loadPosts = useCallback(async () => {
    setPosts(undefined)
    const rows = await fetchFeed()
    setPosts(rows && rows.slice(0, POSTS_SHOWN))
  }, [])

  useEffect(() => {
    document.title = 'Home - Aaslema'
  }, [])

  useEffect(() => {
    loadMoments()
    loadPosts()
  }, [loadMoments, loadPosts])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Your feed</h1>
          <p>The latest moments and posts from travellers across Tunisia.</p>
        </div>
      </section>

      <section className="section feed cm">
        <div className="container cm-layout feed__layout">
          <aside className="cm-sidebar">
            <div className="cm-card cm-filters">
              <div className="cm-filters__head">
                <h3><SlidersHorizontal size={16} /> Filters</h3>
              </div>
              <fieldset className="cm-filters__group">
                <legend className="cm-filters__label">Show</legend>
                {SHOW.map(([value, label]) => (
                  <label key={value} className="cm-filters__option">
                    <input type="radio" name="feed-show" value={value} checked={show === value} onChange={() => setShow(value)} />
                    {label}
                  </label>
                ))}
              </fieldset>
            </div>
          </aside>

          <div className="feed__main">
            {show !== 'posts' && <>
              <h2 className="feed__title">Moments</h2>
              <FeedState items={moments} onRetry={loadMoments} loading="Loading moments…" failed="Couldn't load moments." empty="No moments shared yet." />
              {moments?.length > 0 && (
                <div className="feed-moments">
                  {moments.map((m) => (
                    <a key={m.id} href={m.href} className="moment-card feed-moment">
                      <div className="moment-card__inner">
                        <img src={m.url} alt={m.caption} loading="lazy" />
                        <div className="feed-moment__body">
                          <div className="moment-card__by">
                            {m.author_avatar_url
                              ? <img src={m.author_avatar_url} alt="" className="moment-card__avatar" />
                              : <span className="moment-card__avatar moment-card__avatar--initials" aria-hidden="true">{initials(m.author_name)}</span>}
                            <strong>{m.author_name}</strong>
                          </div>
                          <p className="feed-moment__city"><MapPin size={12} /> {m.cityName}</p>
                          <p className="moment-card__caption">{m.caption}</p>
                          {m.spot && <p className="moment-card__spot"><Navigation size={12} /> {m.spot}</p>}
                          <time dateTime={m.created_at} className="feed-moment__time">{timeAgo(m.created_at)}</time>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              <a href="/app/destinations" className="feed__more">Explore destinations <ArrowRight size={16} /></a>
            </>}

            {show !== 'moments' && <>
              <h2 className="feed__title">Posts</h2>
              <FeedState items={posts} onRetry={loadPosts} loading="Loading posts…" failed="Couldn't load posts." empty="No posts yet." />
              {posts?.length > 0 && (
                <div className="feed-posts">
                  {posts.map((p) => (
                    <article key={p.id} className="cm-card cm-post">
                      <div className="cm-post__head">
                        {p.author_avatar_url
                          ? <img src={p.author_avatar_url} alt="" className="cm-avatar" loading="lazy" />
                          : <span className="cm-avatar cm-avatar--initials" aria-hidden="true">{initials(p.author_name)}</span>}
                        <div className="cm-post__who">
                          <strong>{p.author_name}</strong>
                          <small>{timeAgo(p.created_at)}</small>
                        </div>
                      </div>
                      <h3>{p.title}</h3>
                      <p className="cm-post__text">{p.body}</p>
                    </article>
                  ))}
                </div>
              )}
              <a href="/app/community" className="feed__more">See all in Community <ArrowRight size={16} /></a>
            </>}
          </div>
        </div>
      </section>
    </>
  )
}

// Loading, failed (with Try again) and empty notes for one part of the feed
function FeedState({ items, onRetry, loading, failed, empty }) {
  if (items === undefined) return <p className="profile-note">{loading}</p>
  if (items === null) {
    return (
      <p className="profile-note profile-note--error my-moments__error" role="alert">
        {failed}
        <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>Try again</button>
      </p>
    )
  }
  if (items.length === 0) return <p className="profile-note">{empty}</p>
  return null
}
