import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// null when the env values are missing, so the site still runs without accounts
export const supabase = url && key ? createClient(url, key) : null

// Signed-in user: undefined while the saved session loads, then the user or null.
export function useUser() {
  const [user, setUser] = useState(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
