import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

// Profile dashboard section; placeholder until the AI planner exists (part 4).
export default function Planner() {
  useEffect(() => {
    document.title = 'AI Planner - Aaslema'
  }, [])

  return (
    <>
      <h1>AI Planner</h1>
      <p className="profile-card__lead">Tell us where and how you like to travel, and get a day-by-day route.</p>
      <div className="profile-card planner-soon">
        <p>The AI planner is coming soon. Until then, start from the city guides.</p>
        <a href="/app/destinations" className="btn btn--primary">Browse Destinations <ArrowRight size={16} /></a>
      </div>
    </>
  )
}
