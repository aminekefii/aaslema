import { useEffect } from 'react'
import CityListSection from '../sections/CityListSection.jsx'
import PlanFestivals from '../sections/PlanFestivals.jsx'

// Profile dashboard: the user's plan in two parts, destinations (Add to plan on a destination page)
// and festivals (Add to plan on the festivals page).
export default function MyPlan() {
  useEffect(() => {
    document.title = 'My plan - Aaslema'
  }, [])

  return (
    <>
      <h1>My plan</h1>
      <section className="plan-part">
        <CityListSection table="city_plans" heading="Destinations" emptyText="No destinations in your plan yet." dateLabel="Added" />
      </section>
      <section className="plan-part">
        <PlanFestivals />
      </section>
    </>
  )
}
