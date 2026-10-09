import { ArrowRight } from 'lucide-react'
import { ctas } from '../data.js'

export default function Cta() {
  return (
    <section className="cta">
      <div className="container grid grid--3">
        {ctas.map((c) => (
          <article key={c.tag} className="cta-card" style={{ backgroundImage: `url(${c.image})` }}>
            <span className="cta-card__tag">{c.tag}</span>
            <h3>{c.title}</h3>
            <a href="#tours" className="btn btn--primary btn--sm">Start Exploring <ArrowRight size={14} /></a>
          </article>
        ))}
      </div>
    </section>
  )
}
