# Notes

These are learning notes about the computer science behind this app. They cover the ideas that carry over to any web project: where code runs, who you can trust, how logins work, how databases enforce access, and how tools like Docker fit in. They aren't a Next.js manual.

`docs/architecture.md` says *what* this project is built from and *why*. These notes explain *how the underlying pieces work*.

Suggested reading order:

1. [Where code runs and who to trust](01-where-code-runs.md). This is the mental model everything else depends on.
2. [Sessions, cookies and JWTs](02-sessions-cookies-jwts.md). How "being logged in" works over a stateless protocol.
3. [Database access control (roles, keys and RLS)](03-database-access-control.md). Why the public key sees 0 students and the secret key sees all of them.
4. [The Supabase files, one by one](04-supabase-files.md). Each file in `lib/supabase/` and `proxy.ts`, explained with the concepts above.
5. [Why the old connection code didn't work](05-why-the-old-code-failed.md). A post-mortem that uses all of the above.
6. [Migrations](06-migrations.md). Treating a database schema as code.
7. [Docker](07-docker.md). What containers are and why the Supabase CLI wants them.
8. [Idempotent writes and interfaces as seams](08-idempotency-and-interfaces.md). Why a retried save can't double-count, and why the UI talks to an interface instead of a database.
9. [Serving private data through your own server](09-serving-private-data-through-your-server.md). How the volunteer search reads the real roster: public endpoints, sending the minimum, silent row limits, and "failed" vs "empty".

Never put real student names or donation records in these notes.
