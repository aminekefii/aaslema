import { useEffect, useState } from 'react'
import { ArrowRight, Menu, X, Compass } from 'lucide-react'
import { brand, navLinks } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'header--fixed' : ''}`}>
      <div className="container header__inner">
        <a href="/" className="logo">
          <Compass size={30} strokeWidth={2.2} />
          <span>{brand.name}</span>
        </a>

        <nav className={`nav ${open ? 'nav--open' : ''}`}>
          {navLinks.map(([label, href]) => (
            <a key={label} href={href} className={href === currentPath ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>

        <div className="header__actions">
          <a href="#" className="btn btn--primary header__cta">
            Sign In <ArrowRight size={16} />
          </a>
          <Switcher />
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
