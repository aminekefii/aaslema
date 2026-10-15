import { useEffect } from 'react'

// Read-only until profile editing lands (part 3).
export default function Profile({ user }) {
  useEffect(() => {
    document.title = 'Profile - Aaslema'
  }, [])

  return (
    <>
      <section className="page-banner">
        <div className="container">
          <h1>{user.user_metadata?.full_name || 'Your profile'}</h1>
          <p>{user.email}</p>
        </div>
      </section>
      <section className="section">
        <div className="container coming-soon">
          <p>Editing your profile is coming soon.</p>
        </div>
      </section>
    </>
  )
}
