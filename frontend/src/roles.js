// Who someone is, from their Supabase user. The admin mark lives in app_metadata,
// which only SQL or the Supabase dashboard can set (users can edit user_metadata).
export const isAdmin = (user) => user?.app_metadata?.role === 'admin'

// Where someone lands after signing in
export const homeFor = (user) => (isAdmin(user) ? '/admin' : '/app')
