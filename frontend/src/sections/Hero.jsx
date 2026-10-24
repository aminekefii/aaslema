import { heroImage } from '../data.js'

// Headline and the two ways in, beside the photo framed like a Tunisian doorway arch.
export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 className="hero__title">Tunisia, on foot and by bike.</h1>
          <p className="hero__lead">
            City guides for all 24 governorates, a route planner and travellers who have done it before.
            From the medinas of the north to the ksour of the south.
          </p>
          <div className="hero__actions">
            <a href="/app/profile/planner" className="btn btn--primary">Plan a route</a>
            <a href="/destinations" className="btn btn--outline-light">Browse destinations</a>
          </div>
        </div>
        <figure className="hero__arch">
          <img src={heroImage} alt="Ruins of Carthage above the Gulf of Tunis" />
        </figure>
      </div>
    </section>
  )
}
