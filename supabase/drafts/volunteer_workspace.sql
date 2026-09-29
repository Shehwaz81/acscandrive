-- DRAFT — NOT APPLIED. Kept outside supabase/migrations/ so `supabase db push`
-- cannot apply it by accident. When the Supabase repository is implemented,
-- copy it into supabase/migrations/ with a fresh timestamp, review it, test it
-- locally, then regenerate lib/supabase/database.types.ts.
--
-- students and donation_logs already exist (see the baseline migration),
-- including the method check and the amount_matches_method constraint that
-- requires exactly one of can_count / amount_cents, > 0. This draft only adds
-- what the volunteer workspace needs on top.
--
-- Not changed: `method` stays text with a check constraint rather than an
-- enum. The check already limits the values; converting would rewrite the
-- column for no behavioural gain. 'online' remains allowed for the future
-- feature; the workspace UI only offers cans and cash.

-- Edits overwrite a log directly (owner's decision), so record when.
alter table public.donation_logs
  add column updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger donation_logs_set_updated_at
  before update on public.donation_logs
  for each row execute function public.set_updated_at();

-- "A student's logs, newest first" and "recent logs across everyone".
-- The composite index also serves the student_id foreign key, so it replaces
-- the single-column one.
create index donation_logs_student_recorded_idx
  on public.donation_logs (student_id, recorded_at desc);
drop index public.donation_logs_student_id_idx;
create index donation_logs_recorded_idx on public.donation_logs (recorded_at desc);

-- Name search. Mirrors lib/volunteer/search.ts normalize(): lowercase, strip
-- accents and apostrophes. unaccent() is only STABLE, so an IMMUTABLE wrapper
-- with the dictionary named explicitly is needed for an expression index.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.student_search_name(first_name text, last_name text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, first_name || ' ' || last_name)),
    '''', ''
  );
$$;

create index students_search_name_trgm_idx
  on public.students
  using gin (public.student_search_name(first_name, last_name) extensions.gin_trgm_ops);

-- A search_students(q) RPC would return prefix matches plus up to 4 rows by
-- extensions.similarity(), only when length(q) >= 4.

-- ---------------------------------------------------------------------------
-- RLS (to add with auth; tables already have RLS enabled and no policies)
-- ---------------------------------------------------------------------------
-- Volunteers are signed-in users whose app_metadata carries role = volunteer
-- (app_metadata is set server-side; users cannot edit it). Being signed in
-- alone grants nothing.
--
--   create schema if not exists private;
--   create function private.is_volunteer() returns boolean
--     language sql stable set search_path = ''
--     as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'volunteer', false) $$;
--
--   students:       select to authenticated using ((select private.is_volunteer()))
--   donation_logs:  select, insert, update to authenticated
--                   using / with check ((select private.is_volunteer()))
--                   no delete policy: logs are corrected by editing, never removed
--   anon:           no policies on either table; public pages read aggregates
--                   through a separate view or function that exposes no names.
