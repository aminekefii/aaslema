import { useEffect, useState } from 'react'
import { LogOut, Menu, X, Compass } from 'lucide-react'
import { brand, appNavLinks } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'
import { isAdmin } from '../roles.js'
import { initials } from '../names.js'

// Home is only active on /app itself; the other sections also cover their sub-pages.
const isActive = (href) => href === currentPath || (href !== '/app' && currentPath.startsWith(`${href}/`))

export default function AppHeader({ user, onSignOut }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const name = user.user_metadata?.full_name || user.email

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'header--fixed' : ''}`}>
      <div className="container header__inner">
        <a href="/app" className="logo">
          <Compass size={30} strokeWidth={2.2} />
          <span>{brand.name}</span>
        </a>

        <nav className={`nav nav--app ${open ? 'nav--open' : ''}`}>
          {appNavLinks.map(([label, href]) => (
            <a key={label} href={href} className={isActive(href) ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>
          ))}
          {isAdmin(user) && <a href="/admin" onClick={() => setOpen(false)}>Admin</a>}
          {/* The header's Sign Out button is hidden on phones, so the menu gets its own */}
          <button type="button" className="app-nav__signout" onClick={onSignOut}>Sign Out</button>
        </nav>

        <div className="header__actions">
          <a href="/app/profile" className={`app-user ${currentPath === '/app/profile' ? 'app-user--active' : ''}`} title={name} aria-label={`Profile (${name})`}>
            <span className="app-user__avatar" aria-hidden="true">{initials(name)}</span>
          </a>
          <button type="button" className="btn btn--primary header__cta" onClick={onSignOut}>
            Sign Out <LogOut size={16} />
          </button>
          <Switcher />
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
