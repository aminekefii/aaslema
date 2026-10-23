-- Signed-out visitors read the community feed on /community too (read only: posting, liking and
-- reporting still need an account). Run after 014_community_posts.sql. Safe to re-run.
-- For them auth.uid() is null, so community_feed() returns liked and mine as false.
grant execute on function public.community_feed() to anon;
