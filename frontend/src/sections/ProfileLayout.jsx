import { useState } from 'react'
import { Menu, UserPen, X } from 'lucide-react'
import { profileNavLinks } from '../data.js'
import { displayName } from '../names.js'
import { currentPath } from '../route.js'

const icons = { '/app/profile': UserPen }

// Sidebar + content for /app/profile pages, under the app navbar; on phones the links fold behind a button.
export default function ProfileLayout({ user, children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className="page-banner page-banner--short">
        <div className="container">
          <h1>{displayName(user)}</h1>
          <p>{user.email}</p>
        </div>
      </section>

      <div className="container profile-dash">
        <aside className="profile-side">
          <button type="button" className="profile-menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />} Profile menu
          </button>
          <nav className={`profile-nav ${open ? 'profile-nav--open' : ''}`} aria-label="Profile">
            {profileNavLinks.map(([label, href]) => {
              const Icon = icons[href]
              const active = href === currentPath
              return (
                <a key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                  {Icon && <Icon size={18} />} {label}
                </a>
              )
            })}
          </nav>
        </aside>

        <div className="profile-main">{children}</div>
      </div>
    </>
  )
}
