-- Community posts with up to 3 photos and up to 5 hashtags. Photos go in a public bucket (posts
-- are public since 018), each user in their own folder. Run after 019_post_comments.sql (it
-- replaces community_feed() from there) and 015_my_posts.sql. Safe to re-run.

-- Public bucket: JPEG only, 2 MB max (the browser shrinks photos before upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 2097152, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

drop policy if exists "Users upload post photos to their folder" on storage.objects;
create policy "Users upload post photos to their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Deleting needs select too; files in a public bucket are readable by link anyway
drop policy if exists "Users see their own post photo files" on storage.objects;
create policy "Users see their own post photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own post photos" on storage.objects;
create policy "Users delete their own post photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- At most 3 photos, all in the author's own folder
create or replace function public.post_photos_ok(paths text[], owner uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(paths) <= 3 and coalesce(bool_and(
    p ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' and split_part(p, '/', 1) = owner::text
  ), true)
  from unnest(paths) p
$$;

-- At most 5 hashtags, lower case, 1 to 30 characters, no spaces, # or commas (the site allows letters, numbers and _)
create or replace function public.post_tags_ok(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(tags) <= 5 and coalesce(bool_and(t ~ '^[^[:space:]#,]{1,30}$' and t = lower(t)), true)
  from unnest(tags) t
$$;

alter table public.community_posts add column if not exists photos text[] not null default '{}';
alter table public.community_posts add column if not exists tags text[] not null default '{}';

alter table public.community_posts drop constraint if exists community_posts_photos_check;
alter table public.community_posts add constraint community_posts_photos_check check (public.post_photos_ok(photos, user_id));
alter table public.community_posts drop constraint if exists community_posts_tags_check;
alter table public.community_posts add constraint community_posts_tags_check check (public.post_tags_ok(tags));

grant insert (photos, tags) on public.community_posts to authenticated;
grant update (photos, tags) on public.community_posts to authenticated;

-- community_feed() from 019 with photos and tags added at the end (new columns: drop and create,
-- so the grants from 019 are given again).
drop function if exists public.community_feed();
create function public.community_feed()
returns table (id uuid, author_name text, author_avatar text, city_id text, title text, body text, created_at timestamptz, likes bigint, liked boolean, mine boolean, comments bigint, photos text[], tags text[])
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, coalesce(p.full_name, c.author_name), p.avatar_path, c.city_id, c.title, c.body, c.created_at,
    (select count(*) from public.community_post_likes l where l.post_id = c.id),
    exists (select 1 from public.community_post_likes l where l.post_id = c.id and l.user_id = auth.uid()),
    coalesce(c.user_id = auth.uid(), false),
    (select count(*) from public.community_post_comments m where m.post_id = c.id),
    c.photos, c.tags
  from public.community_posts c
  left join public.profiles p on p.id = c.user_id
  order by c.created_at desc
  limit 100
$$;

revoke all on function public.community_feed() from public;
grant execute on function public.community_feed() to anon, authenticated;

-- my_posts() from 015 with photos and tags, for editing them from My posts
drop function if exists public.my_posts();
create function public.my_posts()
returns table (id uuid, city_id text, title text, body text, created_at timestamptz, likes bigint, photos text[], tags text[])
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.city_id, c.title, c.body, c.created_at,
    (select count(*) from public.community_post_likes l where l.post_id = c.id),
    c.photos, c.tags
  from public.community_posts c
  where c.user_id = auth.uid()
  order by c.created_at desc
$$;

revoke all on function public.my_posts() from public, anon;
grant execute on function public.my_posts() to authenticated;
