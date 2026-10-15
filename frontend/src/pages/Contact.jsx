import { useEffect, useState } from 'react'
import { MapPin, Mail, Clock, Phone, Send } from 'lucide-react'
import { brand } from '../data.js'
import { supabase } from '../supabase.js'
import { messageFromForm } from '../contactMessage.js'

const details = [
  { icon: MapPin, label: 'Address', value: brand.address },
  { icon: Mail, label: 'Email', value: brand.email, href: `mailto:${brand.email}` },
  { icon: Phone, label: 'Phone', value: brand.phone, href: `tel:${brand.phone.replace(/\s/g, '')}` },
  { icon: Clock, label: 'Opening hours', value: brand.hours },
]

const sendFailed = `Couldn't send your message. Please try again, or email us at ${brand.email}.`

export default function Contact({ user }) {
  // null, 'sending', 'sent' or { error }
  const [status, setStatus] = useState(null)

  useEffect(() => {
    document.title = 'Contact - Aaslema'
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const form = e.target
    const result = messageFromForm(Object.fromEntries(new FormData(form)), user)
    if (result.error) return setStatus({ error: result.error })

    // Bots get the normal thank-you, but nothing is saved
    if (!result.spam) {
      setStatus('sending')
      try {
        if (!supabase) throw new Error('Supabase is not configured')
        const { error } = await supabase.from('contact_messages').insert(result.row)
        if (error) throw error
      } catch {
        return setStatus({ error: sendFailed })
      }
    }
    form.reset()
    setStatus('sent')
  }

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

          <form className="contact__form" onSubmit={submit} noValidate>
            <h2>Send us a message</h2>
            <fieldset className="contact__fieldset" disabled={status === 'sending'}>
              <div className="contact__row">
                <label>Name<input type="text" name="name" autoComplete="name" defaultValue={user?.user_metadata?.full_name ?? ''} required /></label>
                <label>Email<input type="email" name="email" autoComplete="email" defaultValue={user?.email ?? ''} required /></label>
              </div>
              <label>Subject<input type="text" name="subject" /></label>
              <label>Message<textarea name="message" rows={6} required /></label>
              {/* Hidden from people; bots that fill every field get caught */}
              <label className="contact__hp" aria-hidden="true">Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
              <button type="submit" className="btn btn--primary">
                {status === 'sending' ? 'Sending…' : <>Send Message <Send size={16} /></>}
              </button>
            </fieldset>
            {status === 'sent' && <p className="contact__sent" role="status">Thanks! We got your message and usually reply within a day.</p>}
            {status?.error && <p className="contact__error" role="alert">{status.error}</p>}
          </form>
        </div>
      </section>
    </>
  )
}
