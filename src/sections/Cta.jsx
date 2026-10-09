import { ArrowRight } from 'lucide-react'
import { ctas } from '../data.js'

export default function Cta() {
  return (
    <section className="cta">
      <div className="container tours__head">
        <h2>Festivals</h2>
        <a href="/festivals" className="all-link">
          See all <ArrowRight size={16} />
        </a>
      </div>
      <div className="container grid grid--3">
        {ctas.map((c) => (
          <article key={c.tag} className="cta-card" style={{ backgroundImage: `url(${c.image})` }}>
            <span className="cta-card__tag">{c.tag}</span>
            <h3>{c.title}</h3>
            <a href={`/destinations/${c.id}`} className="btn btn--primary btn--sm">Discover {c.tag} <ArrowRight size={14} /></a>
          </article>
        ))}
      </div>
      <div className="container">
        <a href="/festivals" className="btn btn--primary tours__all-mobile">See all festivals</a>
      </div>
    </section>
  )
}
