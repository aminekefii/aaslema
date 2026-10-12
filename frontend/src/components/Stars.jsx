import { Star } from 'lucide-react'

export default function Stars({ count = 5 }) {
  return (
    <span className="stars" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }, (_, i) => <Star key={i} size={14} fill="currentColor" />)}
    </span>
  )
}
