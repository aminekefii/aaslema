import Header from './sections/Header.jsx'
import Hero from './sections/Hero.jsx'
import Tours from './sections/Tours.jsx'
import About from './sections/About.jsx'
import PopularDestinations from './sections/PopularDestinations.jsx'
import Features from './sections/Features.jsx'
import TravelStyles from './sections/TravelStyles.jsx'
import Testimonials from './sections/Testimonials.jsx'
import Cta from './sections/Cta.jsx'
import Blog from './sections/Blog.jsx'
import Footer from './sections/Footer.jsx'
import Faq from './pages/Faq.jsx'
import Contact from './pages/Contact.jsx'
import { useEffect } from 'react'
import { currentPath } from './route.js'

// Tiny path-based page switch; any other path shows the landing page.
const pages = { '/faq': Faq, '/contact': Contact }
const Page = pages[currentPath]

export default function App() {
  // Coming from another page via a "/#section" link: scroll once the sections exist.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])

  return (
    <>
      <Header />
      {Page ? <main><Page /></main> : <main>
        <Hero />
        <Tours />
        <About />
        <PopularDestinations />
        <Features />
        <TravelStyles />
        <Testimonials />
        <Cta />
        <Blog />
      </main>}
      <Footer />
    </>
  )
}
