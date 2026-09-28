# Database access control (roles, keys and RLS)

## The unusual part: the browser talks to the database

In a traditional app, only your server talks to the database, and the server decides what each user may see. Supabase also exposes the database through an HTTP API (PostgREST), so browser code can query it directly with the publishable key.

That only works if **the database itself enforces permissions**, because the browser can't be trusted (see [01](01-where-code-runs.md)). Postgres does this with roles and row-level security.

## Roles

Postgres has **roles**: named identities with their own permissions. Supabase maps each request to one:

| Request carries | Postgres role | Meaning |
| --- | --- | --- |
| Publishable key, no login | `anon` | A member of the public |
| Publishable key + a valid user JWT | `authenticated` | A signed-in user (their ID is available to policies) |
| Secret key | `service_role` | Trusted server code. **Bypasses RLS.** |

So the key isn't really a password. It's a claim about *which role* the request runs as. The publishable key is safe to put in the browser because it only grants `anon`, and `anon` can do only what your policies allow.

## Two layers of permission

1. **Grants** (table-level): can this role `SELECT`, `INSERT`, `UPDATE` or `DELETE` on this table at all? Supabase grants these broadly to `anon` and `authenticated` by default.
2. **Row-level security (RLS)** (row-level): of the rows in the table, which can this role see or change?

When RLS is enabled on a table, **every row is hidden by default**. You then add **policies**, which work like `WHERE` clauses Postgres silently appends to every query. For example:

```sql
-- "a volunteer can read students" (illustrative, not in the database)
create policy "volunteers read students" on students
  for select to authenticated
  using ( (auth.jwt() ->> 'app_role') = 'volunteer' );
```

`using` filters which existing rows are visible. `with check` validates rows being inserted or updated.

## What this project has right now

Both tables have RLS enabled and **no policies**. So:

- `anon` and `authenticated` can see and change nothing. The check in this session got `students`: 0 rows with the publishable key, and a rejected insert with SQL error code `42501` (insufficient privilege).
- `service_role` (the secret key) sees all 1,113 students.
- The Supabase security advisor flags "RLS enabled, no policy". Here that's intentional: until volunteer roles and public aggregates are designed, all data access goes through server code.

This is **deny by default**, the safe starting point. You open access deliberately, one policy at a time, rather than forgetting to close it.

## Constraints: the database as the last line of defence

RLS decides *who* can write. **Constraints** decide *what* may be written, whoever writes it:

- `check (grade between 9 and 12)`
- `amount_matches_method`: a `cans` row must have a positive `can_count` and no `amount_cents`, and a `cash` row the reverse.
- The foreign key `donation_logs.student_id → students.student_id`: a donation can't point at a student who doesn't exist.

Validation in the UI and in server code is still worth having for friendly error messages. But the constraint is the only check that holds no matter which code path, script or future bug does the write. The same idea gives you duplicate protection: a **unique constraint** on a submission ID makes a double-submit impossible rather than merely unlikely.

## Why the secret key is dangerous

`service_role` skips RLS entirely. Code using it must do its own authorization and must return only the fields it means to expose. If a secret-key query result is sent to the browser unfiltered, RLS protected nothing. That's why `admin.ts` is guarded with `server-only` and documented as "check authorization first".
