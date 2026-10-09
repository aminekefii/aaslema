import { ArrowRight, ArrowUp, Compass, MapPin, Mail, Clock, Phone, Facebook, Youtube, Instagram, Twitter } from 'lucide-react'
import { brand, footerColumns, images } from '../data.js'

const socials = [Facebook, Youtube, Instagram, Twitter]

export default function Footer() {
  return (
    <footer className="footer" id="contact" style={{ backgroundImage: `url(${images.footer})` }}>
      <div className="container">
        <div className="footer__top">
          <div className="footer__about">
            <a href="#" className="logo"><Compass size={30} strokeWidth={2.2} /><span>{brand.name}</span></a>
            <p>We curate bespoke itineraries tailored to your preferences, making every trip seamless and full of hidden gems off the beaten path.</p>
            <div className="socials">
              {socials.map((Icon, i) => <a key={i} href="#" aria-label="Social link"><Icon size={16} /></a>)}
            </div>
          </div>
          <form className="newsletter" onSubmit={(e) => e.preventDefault()}>
            <h3>Subscribe to Our Newsletter</h3>
            <p>Travel deals and new destinations, once a month.</p>
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
              <ul>{col.links.map((l) => <li key={l}><a href="#">{l}</a></li>)}</ul>
            </div>
          ))}
          <div>
            <h4>Get In Touch</h4>
            <ul className="contact-list">
              <li><MapPin size={16} /> {brand.address}</li>
              <li><Mail size={16} /> <a href={`mailto:${brand.email}`}>{brand.email}</a></li>
              <li><Clock size={16} /> {brand.hours}</li>
              <li><Phone size={16} /> <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <ul>
            {['Terms', 'Privacy Policy', 'Legal Notice', 'Accessibility'].map((l) => <li key={l}><a href="#">{l}</a></li>)}
          </ul>
        </div>
      </div>
      <a href="#" className="scroll-top" aria-label="Back to top"><ArrowUp size={18} /></a>
    </footer>
  )
}
