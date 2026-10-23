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

describe('018_public_community_feed.sql', () => {
  const open = readFileSync(new URL('../../backend/supabase/018_public_community_feed.sql', import.meta.url), 'utf8')

  it('lets signed-out visitors read the feed', () => {
    expect(open).toMatch(/grant execute on function public\.community_feed\(\) to anon;/)
  })
})

describe('019_post_comments.sql', () => {
  const comments = readFileSync(new URL('../../backend/supabase/019_post_comments.sql', import.meta.url), 'utf8')

  it('lets everyone read comments but only signed-in users write them, as themselves', () => {
    expect(comments).toMatch(/grant execute on function public\.post_comments\(uuid\) to anon, authenticated;/)
    expect(comments).toMatch(/grant insert \(post_id, author_name, body\) on public\.community_post_comments to authenticated;/)
    expect(comments).toMatch(/for insert to authenticated with check \(user_id = auth\.uid\(\)\)/)
  })

  it('lets people delete only their own comments', () => {
    expect(comments).toMatch(/for delete to authenticated using \(user_id = auth\.uid\(\)\)/)
  })

  it('keeps the feed open to visitors after adding the comment count', () => {
    expect(comments).toMatch(/grant execute on function public\.community_feed\(\) to anon, authenticated;/)
  })
})

describe('020_feed_moment_likes.sql', () => {
  const likes = readFileSync(new URL('../../backend/supabase/020_feed_moment_likes.sql', import.meta.url), 'utf8')

  it('adds likes but keeps the feed moments approved-only and for signed-in users only', () => {
    expect(likes).toMatch(/where m\.approved_at is not null/)
    expect(likes).toMatch(/l\.user_id = auth\.uid\(\)/)
    expect(likes).toMatch(/revoke all on function public\.feed_moments\(\) from public, anon;/)
    expect(likes).toMatch(/grant execute on function public\.feed_moments\(\) to authenticated;/)
  })
})

describe('021_profile_card.sql', () => {
  const card = readFileSync(new URL('../../backend/supabase/021_profile_card.sql', import.meta.url), 'utf8')

  it('lets users edit only their bio and travel style, and keeps the counts to signed-in users', () => {
    expect(card).toMatch(/grant update \(bio, travel_style\) on public\.profiles to authenticated;/)
    expect(card).toMatch(/revoke all on function public\.my_profile_stats\(\) from public, anon;/)
  })

  it('counts only the caller\'s own visits, approved moments and posts', () => {
    expect(card).toMatch(/v\.user_id = auth\.uid\(\)/)
    expect(card).toMatch(/m\.user_id = auth\.uid\(\) and m\.approved_at is not null/)
    expect(card).toMatch(/c\.user_id = auth\.uid\(\)/)
  })
})

describe('022_public_card.sql', () => {
  const card = readFileSync(new URL('../../backend/supabase/022_public_card.sql', import.meta.url), 'utf8')

  it('is for signed-in users only', () => {
    expect(card).toMatch(/revoke all on function public\.public_card\(text, uuid\) from public, anon;/)
    expect(card).toMatch(/grant execute on function public\.public_card\(text, uuid\) to authenticated;/)
  })

  it('never sends the phone or any id', () => {
    const returns = card.match(/returns table \(([^)]*)\)/)[1]
    expect(returns).not.toMatch(/phone|email|\bid\b|user_id/)
  })

  it('finds moment authors only through approved moments', () => {
    expect(card).toMatch(/m\.id = p_id and m\.approved_at is not null/)
  })
})

describe('023_post_photos_tags.sql', () => {
  const photos = readFileSync(new URL('../../backend/supabase/023_post_photos_tags.sql', import.meta.url), 'utf8')

  it('lets users upload and delete post photos only in their own folder', () => {
    expect(photos).toMatch(/for insert to authenticated\s+with check \(bucket_id = 'post-photos' and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\)/)
    expect(photos).toMatch(/for delete to authenticated\s+using \(bucket_id = 'post-photos' and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\)/)
  })

  it('limits posts to 3 photos from the author\'s folder and 5 hashtags', () => {
    expect(photos).toMatch(/cardinality\(paths\) <= 3/)
    expect(photos).toMatch(/split_part\(p, '\/', 1\) = owner::text/)
    expect(photos).toMatch(/cardinality\(tags\) <= 5/)
  })

  it('keeps the feed open to visitors and My posts to its owner', () => {
    expect(photos).toMatch(/grant execute on function public\.community_feed\(\) to anon, authenticated;/)
    expect(photos).toMatch(/revoke all on function public\.my_posts\(\) from public, anon;/)
  })
})
