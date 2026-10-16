import CityListSection from '../sections/CityListSection.jsx'

// Profile dashboard: destinations the user added to their plan (Add to plan on a destination page).
export default function MyPlan() {
  return (
    <CityListSection
      table="city_plans"
      title="My plan"
      countText={(n) => `${n} ${n === 1 ? 'destination' : 'destinations'} in your plan`}
      emptyText="Your plan is empty. Open a destination and click Add to plan."
      dateLabel="Added"
    />
  )
}
