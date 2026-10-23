import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Heart, MapPin, MessageSquare, Navigation, SlidersHorizontal } from 'lucide-react'
import { cities } from '../cities.js'
import { feedMomentCard, toggleMomentLike } from '../moments.js'
import { fetchFeedMoments, setMomentLike } from '../momentsApi.js'
import { fetchFeed, setPostLike } from '../communityApi.js'
import { LikeButton } from '../components/MomentsCarousel.jsx'
import PostComments from '../components/PostComments.jsx'
import { AuthorButton, useProfileCard } from '../components/ProfileCard.jsx'
import { initials } from '../names.js'
import { timeAgo } from '../timeAgo.js'

const POSTS_SHOWN = 10
// Sidebar choice: [value, label]
const SHOW = [['all', 'Everything'], ['moments', 'Moments'], ['posts', 'Posts']]

// Feed at /app: newest shared moments and community posts. Each part loads on its own; moments and
// posts can be liked here and posts commented on.
export default function AppHome({ user }) {
  // undefined while loading, null if loading failed
  const [moments, setMoments] = useState(undefined)
  const [posts, setPosts] = useState(undefined)
  const [show, setShow] = useState('all')
  // Likes being saved ('m:<id>' / 'p:<id>'), posts whose comments are open, the short message at the bottom
  const [likesSaving, setLikesSaving] = useState(() => new Set())
  const [openComments, setOpenComments] = useState(() => new Set())
  const [toast, setToast] = useState(null)
  // Clicking an author opens their public card
  const { openCard, cardDialog } = useProfileCard(user)

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

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  // Flips straight away; a failed save flips it back
  const like = async (key, item, setItems, save) => {
    if (likesSaving.has(key)) return
    const flip = () => setItems((prev) => prev?.map((x) => (x.id === item.id ? toggleMomentLike(x) : x)))
    setLikesSaving((prev) => new Set(prev).add(key))
    flip()
    if (!(await save(item.id, !item.liked))) {
      flip()
      setToast("Couldn't save your like. Please try again.")
    }
    setLikesSaving((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }
  const likeMoment = (m) => like(`m:${m.id}`, m, setMoments, setMomentLike)
  const likePost = (p) => like(`p:${p.id}`, p, setPosts, setPostLike)

  const toggleComments = (id) => setOpenComments((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const changeCommentCount = (id, delta) =>
    setPosts((prev) => prev?.map((p) => (p.id === id ? { ...p, comments: p.comments + delta } : p)))

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
                    <article key={m.id} className="moment-card feed-moment">
                      <div className="moment-card__inner">
                        <a href={m.href} className="feed-moment__photo"><img src={m.url} alt={m.caption} loading="lazy" /></a>
                        <div className="feed-moment__body">
                          <AuthorButton name={m.author_name} onOpen={openCard && (() => openCard('moment', m.id, m.author_name))} className="moment-card__by">
                            {m.author_avatar_url
                              ? <img src={m.author_avatar_url} alt="" className="moment-card__avatar" />
                              : <span className="moment-card__avatar moment-card__avatar--initials" aria-hidden="true">{initials(m.author_name)}</span>}
                            <strong>{m.author_name}</strong>
                          </AuthorButton>
                          <a href={m.href} className="feed-moment__city"><MapPin size={12} /> {m.cityName}</a>
                          <p className="moment-card__caption">{m.caption}</p>
                          {m.spot && <p className="moment-card__spot"><Navigation size={12} /> {m.spot}</p>}
                          <div className="moment-card__footer">
                            <time dateTime={m.created_at} className="feed-moment__time">{timeAgo(m.created_at)}</time>
                            <LikeButton moment={m} onLike={likesSaving.has(`m:${m.id}`) ? () => {} : likeMoment} />
                          </div>
                        </div>
                      </div>
                    </article>
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
                        <AuthorButton name={p.author_name} onOpen={openCard && (() => openCard('post', p.id, p.author_name))} className="cm-post__author">
                          {p.author_avatar_url
                            ? <img src={p.author_avatar_url} alt="" className="cm-avatar" loading="lazy" />
                            : <span className="cm-avatar cm-avatar--initials" aria-hidden="true">{initials(p.author_name)}</span>}
                          <div className="cm-post__who">
                            <strong>{p.author_name}</strong>
                            <small>{timeAgo(p.created_at)}</small>
                          </div>
                        </AuthorButton>
                      </div>
                      <h3>{p.title}</h3>
                      <p className="cm-post__text">{p.body}</p>

                      <div className="cm-post__actions">
                        <button onClick={() => likePost(p)} aria-disabled={likesSaving.has(`p:${p.id}`)} className={`cm-action ${p.liked ? 'is-liked' : ''}`} aria-pressed={p.liked} aria-label={p.liked ? 'Unlike' : 'Like'}>
                          <Heart size={16} fill={p.liked ? 'currentColor' : 'none'} /> {p.likes}
                        </button>
                        <button onClick={() => toggleComments(p.id)} className={`cm-action ${openComments.has(p.id) ? 'is-open' : ''}`} aria-expanded={openComments.has(p.id)} aria-label={`Comments (${p.comments})`}>
                          <MessageSquare size={16} /> {p.comments}
                        </button>
                      </div>

                      {openComments.has(p.id) && (
                        <PostComments postId={p.id} user={user} onCountChange={(delta) => changeCommentCount(p.id, delta)} openCard={openCard} />
                      )}
                    </article>
                  ))}
                </div>
              )}
              <a href="/app/community" className="feed__more">See all in Community <ArrowRight size={16} /></a>
            </>}
          </div>
        </div>
      </section>

      {cardDialog}

      {toast && (
        <div className="cm-toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
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
