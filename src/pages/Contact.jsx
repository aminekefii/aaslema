import { useEffect, useState } from 'react'
import { MapPin, Mail, Clock, Phone, Send } from 'lucide-react'
import { brand } from '../data.js'

const details = [
  { icon: MapPin, label: 'Address', value: brand.address },
  { icon: Mail, label: 'Email', value: brand.email, href: `mailto:${brand.email}` },
  { icon: Phone, label: 'Phone', value: brand.phone, href: `tel:${brand.phone.replace(/\s/g, '')}` },
  { icon: Clock, label: 'Opening hours', value: brand.hours },
]

export default function Contact() {
  const [sent, setSent] = useState(false)

  useEffect(() => {
    document.title = 'Contact - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>Get In Touch</h1>
          <p>Questions about a route, a city or the community? We usually reply within a day.</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact__grid">
          <ul className="contact__details">
            {details.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="contact__card">
                <span className="contact__icon"><Icon size={22} /></span>
                <div>
                  <h3>{label}</h3>
                  {href ? <a href={href}>{value}</a> : <p>{value}</p>}
                </div>
              </li>
            ))}
          </ul>

          {/* No backend yet: the form only confirms locally. */}
          <form className="contact__form" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <h2>Send us a message</h2>
            <div className="contact__row">
              <label>Name<input type="text" name="name" required /></label>
              <label>Email<input type="email" name="email" required /></label>
            </div>
            <label>Subject<input type="text" name="subject" /></label>
            <label>Message<textarea name="message" rows={6} required /></label>
            <button type="submit" className="btn btn--primary">Send Message <Send size={16} /></button>
            {sent && <p className="contact__sent">Thanks! Your message is ready to go once the form is connected.</p>}
          </form>
        </div>
      </section>
    </>
  )
}
