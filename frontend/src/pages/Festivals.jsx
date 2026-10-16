import { useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { festivalRegions } from '../festivals.js'

export default function Festivals({ user }) {
  useEffect(() => {
    document.title = 'Festivals - Aaslema'
  }, [])

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
                {r.festivals.map((f) => (
                  <li key={f.name} className="fest-item">
                    <h3>{f.name}</h3>
                    <div className="fest-item__when">
                      <span><CalendarDays size={15} /> {f.when}</span>
                      {f.note && <small>{f.note}</small>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="fest__note">Dates shift from year to year. Check with the organisers before you plan around a festival.</p>
        </div>
      </section>
    </>
  )
}
