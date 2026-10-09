import { useEffect } from 'react'
import { X } from 'lucide-react'

// Shared dialog used by the city and community pages. Closes on Escape or backdrop click.
export default function Modal({ title, labelId, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal">
      <div className="modal__backdrop" onClick={onClose} />
      <div className={`modal__panel ${wide ? 'modal__panel--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelId}>
        <button className="modal__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2 id={labelId}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
