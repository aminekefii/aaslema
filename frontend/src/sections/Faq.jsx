import { Plus } from 'lucide-react'
import { faqs } from '../data.js'

// FAQ content mirrors the "Before you go" block on aaslema-new's Home page.
export default function Faq() {
  return (
    <section className="section" id="faq">
      <div className="container faq__grid">
        <div>
          <h2>Before you go</h2>
          <p>
            Can’t find your answer? <a href="/community" className="faq__link">Ask the community</a>
          </p>
        </div>

        <div className="faq__list">
          {faqs.map((item) => (
            <details key={item.q} className="faq__item">
              <summary>
                {item.q}
                <Plus size={18} className="faq__icon" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
