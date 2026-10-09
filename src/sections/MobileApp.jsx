import { CheckCircle2, Apple, Play } from 'lucide-react'
import { appPerks, images } from '../data.js'

export default function MobileApp() {
  return (
    <section className="section mobile-app">
      <div className="container mobile-app__grid">
        <div className="mobile-app__content">
          <div className="section-title section-title--left">
            <h2>We Are Available on the Store. Get Our Mobile App Easily</h2>
          </div>
          <p>We go above and beyond to make your travel dreams a reality. Trust us with the details so you can focus on creating unforgettable memories.</p>
          <ul className="checklist">
            {appPerks.map((p) => <li key={p}><CheckCircle2 size={20} /> {p}</li>)}
          </ul>
          <div className="store-buttons">
            <a href="#" className="store-btn"><Play size={22} fill="currentColor" /><span><small>GET IT ON</small>Google Play</span></a>
            <a href="#" className="store-btn"><Apple size={24} /><span><small>Download on the</small>App Store</span></a>
          </div>
        </div>

        <div className="mobile-app__phones">
          <span className="mobile-app__circle" aria-hidden="true" />
          {images.app.map((src, i) => (
            <div key={src} className={`phone phone--${i + 1}`}>
              <img src={src} alt="App screenshot" loading="lazy" />
              <div className="phone__ui">
                <span className="phone__chip">Trending</span>
                <strong>{i === 0 ? 'Cappadocia' : 'Santorini'}</strong>
                <small>from ${i === 0 ? 42 : 63}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
