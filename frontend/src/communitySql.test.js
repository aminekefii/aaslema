import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Supabase grants anon execute on new public functions by default; revoking from public alone keeps it
const sql = readFileSync(new URL('../../backend/supabase/014_community_posts.sql', import.meta.url), 'utf8')

describe('014_community_posts.sql', () => {
  it('keeps the feed from signed-out visitors', () => {
    expect(sql).toMatch(/revoke all on function public\.community_feed\(\) from public, anon;/)
  })
})
