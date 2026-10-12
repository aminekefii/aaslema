import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'theme'

function initialDark() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return saved === 'dark'
  } catch {}
  return document.documentElement.classList.contains('dark')
}

// Light/dark theme toggle shown in the header, next to the Sign In button
export default function Switcher() {
  const [dark, setDark] = useState(initialDark)

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('dark', dark)
    html.classList.toggle('light', !dark)
    try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light') } catch {}
  }, [dark])

  return (
    <div className="theme-switcher">
      <input
        type="checkbox"
        id="theme-chk"
        className="theme-switcher__input"
        checked={dark}
        onChange={() => setDark(!dark)}
        aria-label="Toggle dark mode"
      />
      <label className="theme-switcher__label" htmlFor="theme-chk">
        <Moon size={18} />
        <Sun size={18} />
        <span className="theme-switcher__ball" />
      </label>
    </div>
  )
}
