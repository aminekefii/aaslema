import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

// Placeholder until the AI planner exists (part 4).
export default function Planner() {
  useEffect(() => {
    document.title = 'AI Planner - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>AI Planner</h1>
          <p>Tell us where and how you like to travel, and get a day-by-day route.</p>
        </div>
      </section>
      <section className="section">
        <div className="container coming-soon">
          <p>The AI planner is coming soon. Until then, start from the city guides.</p>
          <a href="/app/destinations" className="btn btn--primary">Browse Destinations <ArrowRight size={16} /></a>
        </div>
      </section>
    </>
  )
}
