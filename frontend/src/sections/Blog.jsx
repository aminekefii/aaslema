import { useEffect, useState } from 'react'
import { CalendarDays, MessageSquare, ArrowRight, Heart } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { cities } from '../cities.js'
import { storyCards } from '../communityPosts.js'
import { fetchFeed } from '../communityApi.js'

// The 3 most liked community posts. The section stays hidden while loading, and if there are no posts
// or they can't be loaded (an empty section helps nobody).
export default function Blog() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let live = true
    fetchFeed().then((rows) => {
      if (live && rows) setPosts(storyCards(rows, cities))
    })
    return () => { live = false }
  }, [])

  if (posts.length === 0) return null

  return (
    <section className="section blog" id="blog">
      <div className="container">
        <SectionTitle title="Stories and tips from the road" />
        <div className="grid grid--3">
          {posts.map((p) => (
            <article key={p.id} className="blog-card">
              <div className="blog-card__body">
                <span className="tag">{p.tag}</span>
                <h3><a href={p.href}>{p.title}</a></h3>
                <ul className="blog-card__meta">
                  <li><CalendarDays size={14} /> {p.date}</li>
                  <li><Heart size={14} /> {p.likes} {p.likes === 1 ? 'like' : 'likes'}</li>
                  <li><MessageSquare size={14} /> Comments ({p.comments})</li>
                </ul>
              </div>
              <div className="blog-card__image">
                {p.image && <img src={p.image} alt="" loading="lazy" />}
                <a href={p.href} className="btn btn--sm btn--light">Read post <ArrowRight size={14} /></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
