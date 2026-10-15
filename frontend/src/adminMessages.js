// Filtering, counts, previews and reply links for the admin Messages page.

export const isHandled = (m) => Boolean(m.handled_at)

export function filterByStatus(messages, status) {
  if (status === 'new') return messages.filter((m) => !isHandled(m))
  if (status === 'handled') return messages.filter(isHandled)
  return messages
}

export function messageCounts(messages) {
  const handled = messages.filter(isHandled).length
  return { new: messages.length - handled, handled, all: messages.length }
}

export function messagePreview(m, max = 80) {
  const text = (m.subject || m.message || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// Keeps the @ readable for mail apps; everything else is encoded
export function replyHref(m) {
  const to = m.email.split('@').map(encodeURIComponent).join('@')
  const subject = m.subject ? `Re: ${m.subject}` : 'Re: Your message to Aaslema'
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`
}
