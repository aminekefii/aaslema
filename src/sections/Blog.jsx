import { CalendarDays, MessageSquare, ArrowRight } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { posts } from '../data.js'

export default function Blog() {
  return (
    <section className="section blog" id="blog">
      <div className="container">
        <SectionTitle title="Stories &amp; Tips from the Road" />
        <div className="grid grid--3">
          {posts.map((p) => (
            <article key={p.title} className="blog-card">
              <div className="blog-card__body">
                <span className="tag">{p.tag}</span>
                <h3><a href="#">{p.title}</a></h3>
                <ul className="blog-card__meta">
                  <li><CalendarDays size={14} /> {p.date}</li>
                  <li><MessageSquare size={14} /> Comments ({p.comments})</li>
                </ul>
              </div>
              <div className="blog-card__image">
                <img src={p.image} alt={p.title} loading="lazy" />
                <a href="#" className="btn btn--sm btn--light">Read More <ArrowRight size={14} /></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
