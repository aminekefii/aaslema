import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, Menu, X } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { navLinks } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'
import { supabase, useUser } from '../supabase.js'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const user = useUser()
  // Light pages have no dark banner behind the header, so it gets its own background
  const solid = ['/signin', '/signup', '/reset-password'].includes(currentPath)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'header--fixed' : ''} ${solid ? 'header--solid' : ''}`}>
      <div className="container header__inner">
        <Logo href="/" />

        <nav className={`nav ${open ? 'nav--open' : ''}`}>
          {navLinks.map(([label, href]) => (
            <a key={label} href={href} className={href === currentPath || currentPath.startsWith(`${href}/`) ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>
          ))}
          {/* The header's Sign In / Sign Out buttons are hidden on phones, so the menu gets its own */}
          {user && <button type="button" className="app-nav__signout" onClick={() => supabase.auth.signOut()}>Sign Out</button>}
          {user === null && (
            <a href="/signin" className="btn btn--primary nav__signin" onClick={() => setOpen(false)}>
              Sign In <ArrowRight size={16} />
            </a>
          )}
        </nav>

        <div className="header__actions">
          {user && (
            <>
              <span className="header__user">{user.user_metadata?.full_name || user.email}</span>
              <button type="button" className="btn btn--primary header__cta" onClick={() => supabase.auth.signOut()}>
                Sign Out <LogOut size={16} />
              </button>
            </>
          )}
          {user === null && (
            <a href="/signin" className="btn btn--primary header__cta">
              Sign In <ArrowRight size={16} />
            </a>
          )}
          <Switcher />
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
