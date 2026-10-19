import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Supabase grants anon execute on new public functions by default; revoking from public alone keeps it
const sql = readFileSync(new URL('../../backend/supabase/014_community_posts.sql', import.meta.url), 'utf8')

describe('014_community_posts.sql', () => {
  it('keeps the feed from signed-out visitors', () => {
    expect(sql).toMatch(/revoke all on function public\.community_feed\(\) from public, anon;/)
  })
})

describe('015_my_posts.sql', () => {
  const mine = readFileSync(new URL('../../backend/supabase/015_my_posts.sql', import.meta.url), 'utf8')

  it('lists only the caller\'s posts, for signed-in users only', () => {
    expect(mine).toMatch(/where c\.user_id = auth\.uid\(\)/)
    expect(mine).toMatch(/revoke all on function public\.my_posts\(\) from public, anon;/)
    expect(mine).toMatch(/grant execute on function public\.my_posts\(\) to authenticated;/)
  })
})
