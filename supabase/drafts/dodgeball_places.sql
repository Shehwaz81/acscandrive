-- DRAFT, NOT APPLIED. Lives in supabase/drafts so `supabase db push` cannot pick it up.
--
-- Confirmed dodgeball places: the homerooms an organizer has verified as one
-- of the first 20 to reach class size × 10. The Student Standings page shows
-- "Qualified" only for a homeroom with a row here; without the table (or a
-- row) the furthest a class gets is "Target reached · place not confirmed yet".
-- A place is recorded by a person. It is never derived from totals, because
-- how "first" is decided is not a confirmed rule.
--
-- To apply (owner): confirm how places are decided, move this file to
-- supabase/migrations/<timestamp>_dodgeball_places.sql, run
-- `pnpm exec supabase db push`, then regenerate lib/supabase/database.types.ts
-- and drop the untyped read in lib/standings/standings.server.ts (loadPlaces).
--
-- Who writes rows: until there is a volunteer-only action for it (a later
-- task, behind requireVolunteer()), the owner inserts them in the SQL editor:
--   insert into public.dodgeball_places (hr, place) values ('11A', 1);

create table public.dodgeball_places (
  -- Homeroom code, as in students.hr. Not a foreign key: hr is not unique there.
  hr text primary key,
  place smallint not null unique check (place between 1 and 20),
  confirmed_at timestamptz not null default now()
);

-- Server-only, like the other tables: RLS on and no policies, so only the
-- secret key (server code) can read or write it.
alter table public.dodgeball_places enable row level security;
revoke all on public.dodgeball_places from anon, authenticated;
