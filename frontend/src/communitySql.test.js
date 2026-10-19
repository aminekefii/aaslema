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

describe('016_post_reports.sql', () => {
  const reports = readFileSync(new URL('../../backend/supabase/016_post_reports.sql', import.meta.url), 'utf8')

  it('lets only admins read reports', () => {
    expect(reports).toMatch(/for select to authenticated using \(public\.is_admin\(\)\)/)
    expect(reports).toMatch(/revoke all on function public\.admin_post_reports\(\) from public, anon;/)
  })

  it('stops people reporting their own posts or as someone else', () => {
    expect(reports).toMatch(/with check \(user_id = auth\.uid\(\) and public\.post_can_be_reported\(post_id\)\)/)
  })
})

describe('017_feed_moments.sql', () => {
  const feed = readFileSync(new URL('../../backend/supabase/017_feed_moments.sql', import.meta.url), 'utf8')

  it('lists only approved moments, for signed-in users only', () => {
    expect(feed).toMatch(/where m\.approved_at is not null/)
    expect(feed).toMatch(/revoke all on function public\.feed_moments\(\) from public, anon;/)
    expect(feed).toMatch(/grant execute on function public\.feed_moments\(\) to authenticated;/)
  })
})
