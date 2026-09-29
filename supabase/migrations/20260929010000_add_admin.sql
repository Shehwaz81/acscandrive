-- add_admin(username, password): hashes the password with bcrypt and inserts
-- the admin, so you don't have to write crypt()/gen_salt() yourself.
--
-- Run in the Supabase SQL editor:
--   select public.add_admin('desk', 'a-long-password');
--
-- Not callable from the app or the public API; only the database owner (the
-- SQL editor) can run it.

create function public.add_admin(p_username text, p_password text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_username text := lower(btrim(p_username));
begin
  -- The login has no attempt limit, so a long password is the main defence.
  if length(p_password) < 12 then
    raise exception 'Password must be at least 12 characters.';
  end if;

  insert into public.admin (username, password_hash)
  values (v_username, extensions.crypt(p_password, extensions.gen_salt('bf', 12)));

  return v_username;
end;
$$;

revoke execute on function public.add_admin(text, text) from public, anon, authenticated, service_role;
