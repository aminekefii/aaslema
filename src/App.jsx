import Header from './sections/Header.jsx'
import Hero from './sections/Hero.jsx'
import Tours from './sections/Tours.jsx'
import About from './sections/About.jsx'
import PopularDestinations from './sections/PopularDestinations.jsx'
import Features from './sections/Features.jsx'
import MobileApp from './sections/MobileApp.jsx'
import Testimonials from './sections/Testimonials.jsx'
import Cta from './sections/Cta.jsx'
import Blog from './sections/Blog.jsx'
import Footer from './sections/Footer.jsx'
import Faq from './pages/Faq.jsx'
import { useEffect } from 'react'

// Tiny path-based page switch: "/faq" is the FAQ page, everything else is the landing page.
const isFaq = window.location.pathname.replace(/\/+$/, '') === '/faq'

export default function App() {
  // Coming from /faq via a "/#section" link: scroll once the sections exist.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])

  return (
    <>
      <Header />
      {isFaq ? <main><Faq /></main> : <main>
        <Hero />
        <Tours />
        <About />
        <PopularDestinations />
        <Features />
        <MobileApp />
        <Testimonials />
        <Cta />
        <Blog />
      </main>}
      <Footer />
    </>
  )
}
