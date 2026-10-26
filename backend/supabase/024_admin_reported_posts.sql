-- Admin Post reports page: see a reported post and delete it. Run after 016_post_reports.sql and
-- 023_post_photos_tags.sql. Safe to re-run.

-- One post as the community sees it (author's current name), for admins only; no row if it's gone.
-- Runs as the owner because admins can't read other people's posts; refuses anyone else.
create or replace function public.admin_reported_post(p_post_id uuid)
returns table (id uuid, author_name text, city_id text, title text, body text, created_at timestamptz, photos text[], tags text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
    select c.id, coalesce(p.full_name, c.author_name), c.city_id, c.title, c.body, c.created_at, c.photos, c.tags
    from public.community_posts c
    left join public.profiles p on p.id = c.user_id
    where c.id = p_post_id;
end;
$$;

revoke all on function public.admin_reported_post(uuid) from public, anon;
grant execute on function public.admin_reported_post(uuid) to authenticated;

-- Deletes any post (its likes, comments and reports go with it) and returns its photo paths so the
-- page can remove the files; null if the post was already gone. Admins only.
create or replace function public.admin_delete_post(p_post_id uuid)
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  removed text[];
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.community_posts c where c.id = p_post_id returning c.photos into removed;
  return removed;
end;
$$;

revoke all on function public.admin_delete_post(uuid) from public, anon;
grant execute on function public.admin_delete_post(uuid) to authenticated;

-- Admins remove the photos of a deleted post (deleting needs select too)
drop policy if exists "Admins see post photo files" on storage.objects;
create policy "Admins see post photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-photos' and public.is_admin());
drop policy if exists "Admins delete post photos" on storage.objects;
create policy "Admins delete post photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and public.is_admin());
