import { useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import { filterUsers, lastSeen, userStats } from '../../adminUsers.js'

// Read-only list of every account, from the admin-only admin_list_users() function.
export default function AdminUsers() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setError(null)
    setUsers(null)
    try {
      const { data, error } = await supabase.rpc('admin_list_users')
      if (error) setError(error)
      else setUsers(data ?? [])
    } catch (e) {
      setError({ message: e.message })
    }
  }

  useEffect(() => {
    document.title = 'Users - Aaslema Admin'
    load()
  }, [])

  return (
    <>
      <h1>Users</h1>
      {error ? (
        error.code === '42501' ? (
          <p className="admin-note admin-note--error">Your session doesn't have admin rights yet. Sign out and sign in again.</p>
        ) : (
          <p className="admin-note admin-note--error">
            Couldn't load users: {error.message}
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>Try again</button>
          </p>
        )
      ) : users === null ? (
        <p className="admin-note">Loading users…</p>
      ) : (
        <UsersTable users={users} query={query} onQuery={setQuery} />
      )}
    </>
  )
}

function UsersTable({ users, query, onQuery }) {
  const stats = userStats(users)
  const shown = filterUsers(users, query)

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat"><strong>{stats.total}</strong><span>Total users</span></div>
        <div className="admin-stat"><strong>{stats.newThisWeek}</strong><span>New this week</span></div>
        <div className="admin-stat"><strong>{stats.unconfirmed}</strong><span>Unconfirmed emails</span></div>
      </div>

      <input
        type="search"
        className="admin-search"
        placeholder="Search by name or email"
        aria-label="Search users"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />

      {shown.length === 0 ? (
        <p className="admin-note">No users match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Joined</th><th>Last sign-in</th><th>Status</th></tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name || '—'}</td>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>{lastSeen(u.last_sign_in_at)}</td>
                  <td>
                    {u.email_confirmed_at
                      ? <span className="admin-badge admin-badge--ok">Confirmed</span>
                      : <span className="admin-badge admin-badge--warn">Unconfirmed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
