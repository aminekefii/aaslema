import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { faqs } from '../data.js'

// FAQ content mirrors the "Before you go" block on aaslema-new's Home page.
export default function Faq() {
  useEffect(() => {
    document.title = 'FAQ - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p>Everything worth knowing before you travel Tunisia.</p>
        </div>
      </section>

      <section className="section">
        <div className="container faq__grid">
          <div>
            <h2>Before you go</h2>
            <p>
              Can’t find your answer? <a href="/#blog" className="faq__link">Ask the community</a>
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
    </>
  )
}
