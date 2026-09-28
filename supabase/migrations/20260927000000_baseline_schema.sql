-- Baseline: captures the schema that was created directly on the remote project
-- (gcrfsdmkcfywkofhijsi) before migrations were tracked. It is already applied
-- there; record it with `supabase migration repair --status applied 20260927000000`
-- instead of pushing it.

create table public.students (
  student_id bigint generated always as identity primary key,
  first_name text not null check (btrim(first_name) <> ''),
  last_name text not null check (btrim(last_name) <> ''),
  grade smallint not null check (grade between 9 and 12),
  hr text not null check (btrim(hr) <> ''),
  hr_teacher text not null check (btrim(hr_teacher) <> '')
);

create table public.donation_logs (
  transaction_id uuid primary key default gen_random_uuid(),
  student_id bigint not null references public.students (student_id),
  method text not null check (method in ('cans', 'cash', 'online')),
  can_count integer,
  amount_cents integer,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  constraint amount_matches_method check (
    (method = 'cans' and coalesce(can_count, 0) > 0 and amount_cents is null)
    or (method in ('cash', 'online') and coalesce(amount_cents, 0) > 0 and can_count is null)
  )
);

create index donation_logs_student_id_idx on public.donation_logs (student_id);

-- No policies: anon and authenticated can read or write nothing. Access goes
-- through server code until volunteer roles and public aggregates are defined.
alter table public.students enable row level security;
alter table public.donation_logs enable row level security;
