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
10. [Password login from scratch](10-password-login.md). Hashes vs encryption, salts, why bcrypt is slow, signed cookies (HMAC), and why stateless sessions are hard to revoke.
11. [Derived totals and database error codes](11-derived-totals-and-error-codes.md). Why totals are summed from rows instead of stored, and how Postgres errors (unique, foreign key, check) become HTTP 409/400/502.
12. [Public pages: send totals, not rows](12-public-aggregates.md). What a public page really publishes, aggregating at the server boundary, how totals can still leak, where to round money to cans, and how a cached page stays fresh.
13. [Public browser keys: restricted, not hidden](13-public-browser-keys.md). Why a map key has to be visible in the browser, and how referrer, API and quota restrictions limit what a copied key can do.
14. [Requests that finish out of order](14-out-of-order-responses.md). Why a slow, older response can overwrite a newer one, and how stamping each answer with its question prevents it.
15. [Calendar dates vs. instants](15-calendar-dates-vs-instants.md). Why `2026-10-23` can display as Oct 22, and how to group moments into local days without off-by-one errors.

Never put real student names or donation records in these notes.
