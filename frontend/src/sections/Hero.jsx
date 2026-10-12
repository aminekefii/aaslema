import { heroImage } from '../data.js'

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container-fluid">
        <h1 className="hero__title" data-aos="flip-up" data-aos-delay="50">Experience the<br />Real Tunisia</h1>
        <div className="hero__banner" style={{ backgroundImage: `url(${heroImage})` }} />
      </div>
    </section>
  )
}
