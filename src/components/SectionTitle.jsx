import CountUp from './CountUp.jsx'

export default function SectionTitle({ title, subtitle, count, dark = false }) {
  return (
    <div className={`section-title ${dark ? 'section-title--dark' : ''}`}>
      <h2>{title}</h2>
      {subtitle && <p className="title-pill">{subtitle}</p>}
      {count && (
        <p className="title-pill">
          One site <strong><CountUp end={count} suffix="+" /></strong> most popular experiences you’ll remember
        </p>
      )}
    </div>
  )
}
