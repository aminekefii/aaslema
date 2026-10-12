import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, Menu, X, Compass } from 'lucide-react'
import { brand, navLinks } from '../data.js'
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
        <a href="/" className="logo">
          <Compass size={30} strokeWidth={2.2} />
          <span>{brand.name}</span>
        </a>

        <nav className={`nav ${open ? 'nav--open' : ''}`}>
          {navLinks.map(([label, href]) => (
            <a key={label} href={href} className={href === currentPath || currentPath.startsWith(`${href}/`) ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>
          ))}
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
