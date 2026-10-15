import { useState } from 'react'
import { Compass, ExternalLink, LogOut, Menu, Users, X } from 'lucide-react'
import { adminNavLinks, brand } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'

const icons = { '/admin': Users }

// Sidebar shell for /admin pages; becomes a top bar with a menu on phones.
export default function AdminLayout({ user, onSignOut, children }) {
  const [open, setOpen] = useState(false)
  const name = user.user_metadata?.full_name || user.email

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-side__top">
          <a href="/admin" className="logo">
            <Compass size={28} strokeWidth={2.2} />
            <span>{brand.name}<small className="admin-side__label">Admin</small></span>
          </a>
          <button type="button" className="admin-menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>

        <nav className={`admin-nav ${open ? 'admin-nav--open' : ''}`}>
          {adminNavLinks.map(([label, href]) => {
            const Icon = icons[href]
            return (
              <a key={href} href={href} className={href === currentPath ? 'active' : ''} aria-current={href === currentPath ? 'page' : undefined}>
                {Icon && <Icon size={18} />} {label}
              </a>
            )
          })}

          <div className="admin-nav__bottom">
            <a href="/app"><ExternalLink size={18} /> View site</a>
            <button type="button" onClick={onSignOut}><LogOut size={18} /> Sign out</button>
            <div className="admin-side__user">
              <span title={user.email}>{name}</span>
              <Switcher />
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  )
}
