# Migrations: the schema as code

## The problem

Code lives in git: you can see its history, review changes, and rebuild it anywhere. A database schema created by clicking around a dashboard or running one-off SQL has none of that. It exists only in that one database. If the database is lost, or you need a copy for testing, nobody knows exactly how to rebuild it.

That was this project's situation: `students` and `donation_logs` existed on the remote Supabase project, but the repository had no record of how they were made.

## The idea

A **migration** is a SQL file describing one change to the schema: create a table, add a column, add a constraint. Migrations are:

- **Ordered**: file names start with a timestamp, such as `20260927000000_baseline_schema.sql`, and they run in that order.
- **Applied once**: the database keeps a history table (in Supabase, `supabase_migrations.schema_migrations`) listing which migrations it has already run. A tool compares the folder with that table and runs only the new ones.
- **Append-only**: once a migration has been applied somewhere, you don't edit it. To change something, add a new migration. Editing history means different databases end up with different schemas while claiming to be identical.

Replaying every file in order on an empty database gives exactly the current schema. That's what "reproducible" means.

## The baseline

`supabase/migrations/20260927000000_baseline_schema.sql` was written to match the live schema exactly: the tables, check constraints, identity column, foreign key, index and RLS. It was rebuilt from Postgres's own catalog (the internal tables describing every table and constraint).

The remote database already *has* these tables but has no record of this migration. If you ran `supabase db push`, it would try to create them again and fail. The fix is to **mark it as applied without running it**:

```
pnpm exec supabase migration repair --status applied 20260927000000
```

This is the standard move when you start tracking an existing database.

## Schema vs data

Migrations describe **structure**, not **contents**. The 1,113 roster rows aren't in the migration, and must never be committed: the repository may be public, and they're real students. Test data should be synthetic.

## Related habits

- Generate types (`database.types.ts`) from the schema after each migration so the code and database agree.
- Treat destructive migrations (drop column, change type) with care on a database holding real data. Check what's there first, and have a backup.
