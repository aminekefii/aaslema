-- Mark the site owner's account as admin. Run after 001; safe to re-run.
-- Afterwards, sign out and sign in again so the session picks up the mark.
-- The result should show exactly one row; no rows means the email didn't match an account.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'aminekefi416@gmail.com'
returning id, email, raw_app_meta_data;

-- To remove admin rights again:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role'
-- where email = 'aminekefi416@gmail.com';
-- Removal takes effect when the admin's session token refreshes (up to about an hour) or on sign-out.
