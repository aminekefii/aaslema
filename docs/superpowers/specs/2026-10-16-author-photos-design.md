# Author photos on reviews and moments — design

Date: 2026-10-16
Status: approved in brainstorming, awaiting spec review

## Goal

Show each author's current profile photo and name on the landing page review
slider and on destination moment cards. Users without a photo keep an
initials circle. When a user changes their name or photo, their old reviews
and moments show the new ones.

Builds on `public.profiles` and the public `avatars` bucket
(`009_profiles.sql`), `avatarUrl` (`profileApi.js`) and `initials` (`names.js`).

## Decisions

| Question | Decision |
|---|---|
| Where | Landing page reviews and destination moments only (not admin pages) |
| Name shown | The profile's current `full_name`; the post's saved `author_name` if there is no profile row |
| Photo shown | The profile's current `avatar_path` as a public link; initials when none |
| How | `published_reviews()` and `published_moments(text)` join `public.profiles` and return `author_avatar` |
| Privacy | Only name and photo path leave the database; no phone, city or country. The photo path starts with the author's user id, which the public photo link shows anyway (accepted) |
| Before `010` is run | Cards keep initials and saved names (the field is simply missing) |

## Database

New file `backend/supabase/010_author_photos.sql`, run once in the Supabase
SQL Editor after `006`, `007`, `008` and `009`; safe to re-run. Both functions
change their return type, so they are dropped and recreated.

```sql
-- Author name and photo on published reviews and moments, read live from public.profiles.
-- Run after 006_reviews.sql, 007_moments.sql, 008_moment_likes.sql and 009_profiles.sql. Safe to re-run.
-- Re-running 006 or 008 later undoes this file (008 quietly, 006 with an error): run 010 again afterwards.
-- The photo path starts with the author's user id (it is in the public photo link anyway).

-- Stop before dropping anything if 009 hasn't been run
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run 009_profiles.sql before 010_author_photos.sql';
  end if;
end $$;

-- Approved reviews for the landing page, newest first, without user ids (the photo path has one, see above).
drop function if exists public.published_reviews();
create function public.published_reviews()
returns table (id uuid, author_name text, author_avatar text, travel_style text, rating smallint, body text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, coalesce(p.full_name, r.author_name), p.avatar_path, r.travel_style, r.rating, r.body
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.approved_at is not null
  order by r.approved_at desc
  limit 20
$$;

revoke all on function public.published_reviews() from public;
grant execute on function public.published_reviews() to anon, authenticated;

-- Approved moments of a destination with like counts, newest first, without user ids (the photo path has one, see above).
drop function if exists public.published_moments(text);
create function public.published_moments(p_city_id text)
returns table (id uuid, author_name text, author_avatar text, spot text, caption text, image_path text, created_at timestamptz, likes bigint, liked boolean, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, coalesce(p.full_name, m.author_name), p.avatar_path, m.spot, m.caption, m.image_path, m.created_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id),
    exists (select 1 from public.moment_likes l where l.moment_id = m.id and l.user_id = auth.uid()),
    coalesce(m.user_id = auth.uid(), false)
  from public.moments m
  left join public.profiles p on p.id = m.user_id
  where m.city_id = p_city_id and m.approved_at is not null
  order by m.approved_at desc
  limit 50
$$;

revoke all on function public.published_moments(text) from public;
grant execute on function public.published_moments(text) to anon, authenticated;
```

## Site

- `src/reviewsApi.js`: `fetchPublishedReviews` adds `author_avatar_url: avatarUrl(r.author_avatar)`
  to each row (`null` when there is no photo or the field is missing).
- `src/reviews.js`: `cardsFromReviews` sets `avatar: r.author_avatar_url ?? null`
  (was always `null`). `Testimonials.jsx` already shows `avatar` when set and
  initials otherwise; no change there.
- `src/momentsApi.js`: `fetchPublishedMoments` adds `author_avatar_url` the same way;
  the comment about `008` is updated to mention `010`.
- `src/components/MomentsCarousel.jsx`: the name line becomes
  `.moment-card__by`: a 28px round photo (`alt=""`, the name is next to it)
  or a 28px initials circle (`aria-hidden`), then the name.
- `src/styles.css`: `.moment-card__by`, `.moment-card__avatar`
  (shared size and round shape for the image and the initials span).

## Files

| File | Change |
|---|---|
| `backend/supabase/010_author_photos.sql` | New |
| `frontend/src/reviews.js`, `reviews.test.js` | `cardsFromReviews` uses `author_avatar_url` |
| `frontend/src/reviewsApi.js` | Adds `author_avatar_url` |
| `frontend/src/momentsApi.js` | Adds `author_avatar_url` |
| `frontend/src/components/MomentsCarousel.jsx` | Photo or initials next to the name |
| `frontend/src/styles.css` | Moment card author row |

## Testing

- **Automated (Vitest):** `reviews.test.js`: `cardsFromReviews` passes
  `author_avatar_url` through as `avatar`, and gives `null` when it is missing.
- **Manual (owner):**
  1. Run `010_author_photos.sql`.
  2. User A (with a profile photo) and user B (without) each post a review
     and a moment on `/app/destinations/tozeur`; an admin approves all four.
  3. Landing page slider: A's card shows A's photo, B's card shows initials.
  4. Tozeur Moments tab (signed in and signed out): A's card shows a small
     round photo next to the name, B's shows initials; likes still work.
  5. A changes name and photo on `/app/profile`; after a reload both of A's
     cards show the new name and photo.

## Future work

- Photos on admin Reviews, Moments and Users pages, and in the admin sidebar.
- Photos on Feed / Community posts once they are in Supabase.
