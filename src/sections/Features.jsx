import { useState } from 'react'
import { Map, Route, Users, Bus, Bike, Footprints, TrainFront } from 'lucide-react'
import { features, sampleItinerary } from '../data.js'

const icons = { map: Map, route: Route, users: Users, bus: Bus }
const legIcons = { train: TrainFront, bus: Bus, bike: Bike }
const modes = [
  { id: 'foot', label: 'On foot', icon: Footprints },
  { id: 'bike', label: 'By bike', icon: Bike },
]

// Trip planner teaser (from aaslema-new's Home page), drawn as a route:
// the switch swaps how you travel between stops.
function PlannerCard() {
  const [mode, setMode] = useState('foot')

  return (
    <div className="planner-card">
      <div className="planner-card__head">
        <h3>Get a day-by-day route in seconds</h3>
        <div className="planner-mode" role="radiogroup" aria-label="How you travel">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              className={mode === id ? 'is-active' : ''}
              onClick={() => setMode(id)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>
      <p className="planner-card__lead">
        Pick your cities, how many days you have, and whether you're on foot or on a bike.
        The planner builds an itinerary you can save or export as a PDF.
      </p>

      <ol className="planner-route" aria-label="Example 3-day route">
        {sampleItinerary.map((stop) => {
          const leg = stop.leg?.[mode]
          const LegIcon = leg && legIcons[leg.icon]
          return (
            <li key={stop.day} className="planner-stop">
              {leg && (
                <p className="planner-leg" key={mode}>
                  <LegIcon size={15} /> {leg.text}
                </p>
              )}
              <div className="planner-stop__body">
                <span className="planner-stop__day">{stop.day}</span>
                <div>
                  <strong>{stop.place}</strong>
                  <p>{stop.note}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <a href="#" className="btn btn--primary">Open the trip planner</a>
    </div>
  )
}

export default function Features() {
  return (
    <section className="section features">
      <div className="container">
        <div className="section-title section-title--left features__head">
          <h2>Everything you need to explore Tunisia</h2>
          <p>Guides for every governorate, a planner that builds your route, and travelers who have done it before.</p>
        </div>

        <div className="features__grid">
          <PlannerCard />

          <div className="features__list">
            {features.map((f) => {
              const Icon = icons[f.icon]
              return (
                <div key={f.title} className="feature-card">
                  <span className="feature-card__icon"><Icon size={26} strokeWidth={1.5} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
