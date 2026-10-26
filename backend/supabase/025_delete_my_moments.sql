-- My moments: users delete their own moments (pending or published); likes go with them.
-- Run after 007_moments.sql and 011_my_moments.sql. Safe to re-run.
-- Once the row is gone the photo is unused, so "Moment photos: admins, or uploader before saving"
-- (007) already lets the uploader remove the file.

drop policy if exists "Users delete their own moments" on public.moments;
create policy "Users delete their own moments" on public.moments
  for delete to authenticated
  using (user_id = auth.uid());
