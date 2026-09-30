-- Street claims for the collection map (owner, 2026-09-30).
-- One claimer per street (place_id is unique); a student may claim any number
-- of streets; no dates, no editing. The claimer deletes their own claim through
-- DELETE /api/claims, organizers in the SQL editor. Deleting removes the row.

create table public.street_claims (
  id          uuid primary key default gen_random_uuid(),
  student_id  bigint not null references public.students (student_id),
  -- Google place ID: the street's identity.
  place_id    text not null unique check (char_length(place_id) between 1 and 300),
  -- e.g. "Ouellette Avenue, Windsor"
  address     text not null check (char_length(address) between 1 and 200),
  -- Marker position, so claims can be drawn without calling Google per claim.
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  created_at  timestamptz not null default now()
);

create index street_claims_student_id_idx on public.street_claims (student_id);

-- No policies: server-only, like the other tables.
alter table public.street_claims enable row level security;
