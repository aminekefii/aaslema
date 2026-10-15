import { useEffect, useState } from 'react'

// Cards per view for the sliders, matching travosy-react's tiny-three-item slider (3 / 2 / 1).
export default function usePerView() {
  const get = () => (window.innerWidth >= 992 ? 3 : window.innerWidth >= 767 ? 2 : 1)
  const [perView, setPerView] = useState(get)
  useEffect(() => {
    const onResize = () => setPerView(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return perView
}
