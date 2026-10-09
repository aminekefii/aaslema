import { ArrowRight, ArrowUp, Compass, Facebook, Instagram, Twitter } from 'lucide-react'
import { brand, footerColumns, images } from '../data.js'

const socials = [
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/' },
  { icon: Twitter, label: 'Twitter', href: 'https://twitter.com/' },
  { icon: Facebook, label: 'Facebook', href: 'https://www.facebook.com/' },
]

export default function Footer() {
  return (
    <footer className="footer" style={{ backgroundImage: `url(${images.footer})` }}>
      <div className="container">
        <div className="footer__top">
          <div className="footer__about">
            <a href="/" className="logo"><Compass size={30} strokeWidth={2.2} /><span>{brand.name}</span></a>
            <p>A travel guide for backpackers and bikepackers exploring Tunisia, from the medinas to the Sahara.</p>
            <div className="socials">
              {socials.map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon size={16} /></a>
              ))}
            </div>
          </div>
          <form className="newsletter" onSubmit={(e) => e.preventDefault()}>
            <h3>Stories from the Road</h3>
            <p>New routes, city guides and community tips, once a month.</p>
            <div className="newsletter__field">
              <input type="email" placeholder="Email Address" required />
              <button type="submit" className="btn btn--primary">Subscribe <ArrowRight size={16} /></button>
            </div>
          </form>
        </div>

        <div className="footer__links">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>{col.links.map(([label, href]) => <li key={label}><a href={href}>{label}</a></li>)}</ul>
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
