import Header from './sections/Header.jsx'
import AppHeader from './sections/AppHeader.jsx'
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
import Destinations from './pages/Destinations.jsx'
import CityDetail from './pages/CityDetail.jsx'
import { SignIn, SignUp, ResetPassword } from './pages/Auth.jsx'
import Festivals from './pages/Festivals.jsx'
import Community from './pages/Community.jsx'
import AppHome from './pages/AppHome.jsx'
import Planner from './pages/Planner.jsx'
import Profile from './pages/Profile.jsx'
import { useEffect, useState } from 'react'
import { currentPath } from './route.js'
import { isAppPath, redirectFor } from './redirects.js'
import { supabase, useUser } from './supabase.js'

// Tiny path-based page switch; any other public path shows the landing page.
const pages = { '/faq': Faq, '/contact': Contact, '/destinations': Destinations, '/festivals': Festivals, '/community': Community, '/signin': SignIn, '/signup': SignUp, '/reset-password': ResetPassword }
// Signed-in area; keep in sync with appPages in redirects.js
const appPages = { '/app': AppHome, '/app/destinations': Destinations, '/app/festivals': Festivals, '/app/community': Community, '/app/contact': Contact, '/app/planner': Planner, '/app/profile': Profile }
const inApp = isAppPath(currentPath)
const cityId = currentPath.match(/^\/(?:app\/)?destinations\/([^/]+)$/)?.[1]
const Page = cityId ? () => <CityDetail id={cityId} /> : (inApp ? appPages : pages)[currentPath]

export default function App() {
  const user = useUser()
  const [signingOut, setSigningOut] = useState(false)
  // Wait for the saved session before deciding, so the wrong page never flashes
  const redirect = user === undefined || signingOut ? null : redirectFor(currentPath, user !== null)
  const ready = user !== undefined && !redirect && !(inApp && !user)

  useEffect(() => {
    if (redirect) window.location.replace(redirect)
  }, [redirect])

  // Coming from another page via a "/#section" link: scroll once the sections exist.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (ready && id) document.getElementById(id)?.scrollIntoView()
  }, [ready])

  // The flag stops the signed-out redirect to /signin from racing this navigation
  const signOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      window.location.assign('/')
    }
  }

  if (!ready) return null

  return (
    <>
      {inApp ? <AppHeader user={user} onSignOut={signOut} /> : <Header />}
      {Page ? <main><Page user={user} /></main> : <main>
        <Hero />
        <Tours />
        <About />
        <TravelStyles />
        <PopularDestinations />
        <Features />
        <Testimonials />
        <Cta />
        <Blog />
      </main>}
      <Footer />
    </>
  )
}
