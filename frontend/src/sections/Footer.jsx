import { ArrowUp } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { brand, footerColumns, images } from '../data.js'
import { isAppPath, redirectFor } from '../redirects.js'
import { currentPath } from '../route.js'

// Inside the app, point internal links at their /app twin to skip a redirect
const appHref = (href) => (isAppPath(currentPath) && redirectFor(href, true)) || href

export default function Footer() {
  return (
    <footer className="footer" style={{ backgroundImage: `url(${images.footer})` }}>
      <div className="container">
        <div className="footer__links">
          <div className="footer__about">
            <Logo href={isAppPath(currentPath) ? '/app' : '/'} />
            <p>A travel guide for backpackers and bikepackers exploring Tunisia, from the medinas to the Sahara.</p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>{col.links.map(([label, href]) => <li key={label}><a href={appHref(href)}>{label}</a></li>)}</ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} {brand.name} Tunisia</p>
        </div>
      </div>
      <a href="#" className="scroll-top" aria-label="Back to top"><ArrowUp size={18} /></a>
    </footer>
  )
}
