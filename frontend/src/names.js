// Names shown for an account: the navbar avatar and review cards.

export function displayName(user) {
  const full = user?.user_metadata?.full_name?.trim()
  return full || (user?.email ?? '').split('@')[0]
}

// "Leila Ben Ali" -> "LB", "tom@x.com" -> "T"; Array.from keeps an emoji whole
export const initials = (name) =>
  name.trim().split(/\s+/).map((w) => Array.from(w)[0] ?? '').slice(0, 2).join('').toUpperCase()
