import { cities } from '../cities.js'
import CityListSection from '../sections/CityListSection.jsx'

// Profile dashboard: destinations the user marked as visited.
export default function VisitedDestinations() {
  return (
    <CityListSection
      table="city_visits"
      title="Visited destinations"
      countText={(n) => `${n} of ${cities.length} destinations visited`}
      emptyText="You haven't marked any destinations as visited yet."
      dateLabel="Visited"
    />
  )
}
