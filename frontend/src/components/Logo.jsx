import { brand } from '../data.js'

// The Aaslema wordmark (red ink on a transparent background, cut from the logo artwork).
// Sits on the dark header, footer and admin sidebar.
export default function Logo({ href, className = '', children = null }) {
  return (
    <a href={href} className={`logo ${className}`}>
      <img src="/images/logo/aaslema-wordmark.png" alt={brand.name} className="logo__img" width="164" height="40" />
      {children}
    </a>
  )
}
