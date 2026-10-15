import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

// Placeholder until posts live in Supabase (part 2: feed).
export default function AppHome() {
  useEffect(() => {
    document.title = 'Home - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Your feed</h1>
          <p>Posts from travellers across Tunisia will show up here.</p>
        </div>
      </section>
      <section className="section">
        <div className="container coming-soon">
          <p>The feed is coming soon. In the meantime, see what people are sharing in the community.</p>
          <a href="/app/community" className="btn btn--primary">Go to Community <ArrowRight size={16} /></a>
        </div>
      </section>
    </>
  )
}
