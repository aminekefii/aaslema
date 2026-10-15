import { useEffect, useState } from 'react'
import { Compass, ExternalLink, LogOut, Mail, Menu, Users, X } from 'lucide-react'
import { adminNavLinks, brand } from '../data.js'
import Switcher from '../components/Switcher.jsx'
import { currentPath } from '../route.js'
import { supabase } from '../supabase.js'

const icons = { '/admin': Users, '/admin/messages': Mail }

// Number of unhandled messages; reloads when the Messages page changes one
function useNewMessageCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const { count, error } = await supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .is('handled_at', null)
        if (!error) setCount(count ?? 0)
      } catch {
        // No badge if the count can't be loaded
      }
    }
    load()
    window.addEventListener('admin:messages-changed', load)
    return () => window.removeEventListener('admin:messages-changed', load)
  }, [])

  return count
}

// Sidebar shell for /admin pages; becomes a top bar with a menu on phones.
export default function AdminLayout({ user, onSignOut, children }) {
  const [open, setOpen] = useState(false)
  const name = user.user_metadata?.full_name || user.email
  const newMessages = useNewMessageCount()

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
                {href === '/admin/messages' && newMessages > 0 && <span className="admin-nav__count">{newMessages}</span>}
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
