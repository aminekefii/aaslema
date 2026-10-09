import { useEffect, useState } from 'react'
import { ArrowRight, Menu, X, Compass } from 'lucide-react'
import { brand, navLinks } from '../data.js'

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
        <a href="#" className="logo">
          <Compass size={30} strokeWidth={2.2} />
          <span>{brand.name}</span>
        </a>

        <nav className={`nav ${open ? 'nav--open' : ''}`}>
          {navLinks.map((link) => (
            <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setOpen(false)}>{link}</a>
          ))}
        </nav>

        <div className="header__actions">
          <a href="#" className="btn btn--primary header__cta">
            Sign In <ArrowRight size={16} />
          </a>
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
