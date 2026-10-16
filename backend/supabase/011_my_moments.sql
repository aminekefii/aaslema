-- My moments: a user's own moments with like counts, and their own photos (pending ones too).
-- Run after 007_moments.sql and 008_moment_likes.sql. Safe to re-run.

-- The caller's moments, newest first. Runs as the owner so likes from everyone are counted.
create or replace function public.my_moments()
returns table (id uuid, city_id text, spot text, caption text, image_path text, created_at timestamptz, approved_at timestamptz, likes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.city_id, m.spot, m.caption, m.image_path, m.created_at, m.approved_at,
    (select count(*) from public.moment_likes l where l.moment_id = m.id)
  from public.moments m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit 100
$$;

revoke all on function public.my_moments() from public;
grant execute on function public.my_moments() to authenticated;

-- Uploaders see their own photos, pending ones included (adds to "Moment photos: admins, or published").
-- Only photos a moment uses: a file uploaded without a moment, or left after an admin deleted the
-- moment, stays unreadable, so the bucket still can't host images nobody reviews.
drop policy if exists "Moment photos: uploader reads their own" on storage.objects;
create policy "Moment photos: uploader reads their own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text
    and public.moment_photo_is_used(name)
  );
