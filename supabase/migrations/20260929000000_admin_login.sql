-- Volunteer/admin login. Each row is a username and a bcrypt password hash.
-- Anyone in this table can open /volunteer; there are no roles.
--
-- Add an admin (run in the Supabase SQL editor; use a long password).
-- Easier: select public.add_admin('desk', 'a-long-password'); (next migration)
--   insert into public.admin (username, password_hash)
--   values ('desk', extensions.crypt('a-long-password', extensions.gen_salt('bf', 12)));
--
-- Change a password:
--   update public.admin
--   set password_hash = extensions.crypt('new-password', extensions.gen_salt('bf', 12))
--   where username = 'desk';
--
-- Remove an admin (their current session still lasts until it expires, at
-- most 12 hours; rotate SESSION_SECRET to sign everyone out immediately):
--   delete from public.admin where username = 'desk';

create extension if not exists pgcrypto with schema extensions;

create table public.admin (
  admin_id bigint generated always as identity primary key,
  -- Lowercase letters, digits, "_" and "-": no dots, so it fits in the cookie.
  username text not null unique check (username ~ '^[a-z0-9_-]{3,40}$'),
  -- bcrypt hashes start with "$2". Rejects a plaintext password by mistake.
  password_hash text not null check (password_hash like '$2%'),
  created_at timestamptz not null default now()
);

-- Server-only: no policies and no grants for the browser roles.
alter table public.admin enable row level security;
revoke all on public.admin from anon, authenticated;

-- True only when the username exists and the password matches its hash.
-- crypt() re-hashes the attempt with the salt stored inside the hash.
create function public.verify_admin(p_username text, p_password text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select password_hash = extensions.crypt(p_password, password_hash)
     from public.admin
     where username = lower(btrim(p_username))),
    false
  );
$$;

-- Only the server (secret key) may call it, so the public key can't be used
-- to guess passwords.
revoke execute on function public.verify_admin(text, text) from public, anon, authenticated;
grant execute on function public.verify_admin(text, text) to service_role;
