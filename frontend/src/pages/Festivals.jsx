import { useEffect, useState } from 'react'
import { Calendar, CalendarDays, CheckCircle2 } from 'lucide-react'
import { festivalRegions } from '../festivals.js'
import { fetchMyCityIds, setCityFlag } from '../cityActivity.js'
import { toggleId } from '../cityCounts.js'

export default function Festivals({ user }) {
  // Festival ids in the user's plan: undefined while loading, null if loading failed
  const [planned, setPlanned] = useState(undefined)
  // Festivals being saved; each button waits only for its own save
  const [busy, setBusy] = useState([])
  const [saveError, setSaveError] = useState(false)
  const userId = user?.id

  useEffect(() => {
    document.title = 'Festivals - Aaslema'
  }, [])

  useEffect(() => {
    setPlanned(undefined)
    if (!userId) return
    let current = true
    fetchMyCityIds('festival_plans', 'festival_id').then((ids) => { if (current) setPlanned(ids) })
    return () => { current = false }
  }, [userId])

  // Flip right away; flip back if saving fails
  const togglePlan = async (festivalId) => {
    const on = !planned.includes(festivalId)
    setSaveError(false)
    setBusy((b) => [...b, festivalId])
    setPlanned((p) => toggleId(p, festivalId, on))
    const saved = await setCityFlag('festival_plans', festivalId, on, 'festival_id')
    if (!saved) {
      setPlanned((p) => p && toggleId(p, festivalId, !on))
      setSaveError(true)
    }
    setBusy((b) => b.filter((id) => id !== festivalId))
  }

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Festivals</h1>
          <p>What's on across Tunisia, region by region, from summer nights at Carthage to December in the Sahara.</p>
        </div>
      </section>

      <section className="section">
        <div className="container fest">
          {/* Visitors only; signed-in users are on /app/festivals */}
          {!user && (
            <p className="fest__signin">
              <CalendarDays size={18} /> Sign in to add festivals to your plan. <a href="/signin">Sign in</a>
            </p>
          )}
          {user && planned === null && (
            <p className="city-note city-note--error fest__plan-note" role="alert">Couldn't load your plan. Please refresh the page.</p>
          )}
          {saveError && <p className="city-note city-note--error fest__plan-note" role="alert">Couldn't save that. Please try again.</p>}
          <nav className="fest__regions" aria-label="Jump to a region">
            {festivalRegions.map((r) => (
              <a key={r.id} href={`#${r.id}`}>{r.region}</a>
            ))}
          </nav>

          {festivalRegions.map((r) => (
            <section key={r.id} id={r.id} className="fest-region">
              <header className="fest-region__head">
                <h2>{r.region}</h2>
                <p>{r.places}</p>
              </header>
              <ul className="fest-list">
                {r.festivals.map((f) => {
                  const inPlan = Array.isArray(planned) && planned.includes(f.id)
                  return (
                    <li key={f.id} className={`fest-item ${user ? 'fest-item--plannable' : ''}`}>
                      <h3>{f.name}</h3>
                      <div className="fest-item__when">
                        <span><CalendarDays size={15} /> {f.when}</span>
                        {f.note && <small>{f.note}</small>}
                      </div>
                      {user && (
                        <button
                          type="button"
                          onClick={() => togglePlan(f.id)}
                          disabled={!Array.isArray(planned) || busy.includes(f.id)}
                          aria-pressed={inPlan}
                          className={`city-btn fest-item__plan ${inPlan ? 'city-btn--soft' : ''}`}
                        >
                          {inPlan ? <CheckCircle2 size={16} /> : <Calendar size={16} />}
                          {inPlan ? 'In your plan' : 'Add to plan'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <p className="fest__note">Dates shift from year to year. Check with the organisers before you plan around a festival.</p>
        </div>
      </section>
    </>
  )
}
