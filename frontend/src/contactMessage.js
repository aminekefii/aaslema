// Turns Contact form fields into a row for public.contact_messages,
// with the same limits as the database so people see a clear message.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function messageFromForm(fields, user) {
  // Hidden field only bots fill in
  if (fields.website?.trim()) return { spam: true }

  const name = (fields.name ?? '').trim()
  const email = (fields.email ?? '').trim()
  const subject = (fields.subject ?? '').trim()
  const message = (fields.message ?? '').trim()

  if (!name) return { error: 'Please enter your name.' }
  if (name.length > 100) return { error: 'Your name is too long (100 characters max).' }
  if (email.length > 254 || !EMAIL.test(email)) return { error: 'Please enter a valid email address.' }
  if (subject.length > 150) return { error: 'Your subject is too long (150 characters max).' }
  if (!message) return { error: 'Please write a message.' }
  if (message.length > 5000) return { error: 'Your message is too long (5000 characters max).' }

  return { row: { name, email, subject: subject || null, message, user_id: user?.id ?? null } }
}
