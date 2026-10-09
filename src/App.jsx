import Header from './sections/Header.jsx'
import Hero from './sections/Hero.jsx'
import Tours from './sections/Tours.jsx'
import About from './sections/About.jsx'
import PopularDestinations from './sections/PopularDestinations.jsx'
import Features from './sections/Features.jsx'
import Hotels from './sections/Hotels.jsx'
import MobileApp from './sections/MobileApp.jsx'
import Testimonials from './sections/Testimonials.jsx'
import Cta from './sections/Cta.jsx'
import Blog from './sections/Blog.jsx'
import Footer from './sections/Footer.jsx'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Tours />
        <About />
        <PopularDestinations />
        <Features />
        <Hotels />
        <MobileApp />
        <Testimonials />
        <Cta />
        <Blog />
      </main>
      <Footer />
    </>
  )
}
