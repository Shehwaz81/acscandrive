<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Volunteer login (project rule)

`/volunteer` and `/api/volunteer/*` serve private student data and require an admin login. Admins are rows in `public.admin` (bcrypt hash via `pgcrypto`), checked by the `verify_admin()` SQL function, which only the server may call. The session is an HMAC-signed `HttpOnly` cookie (`lib/auth/`, secret `SESSION_SECRET`).

Every page, layout, route handler and server action that touches volunteer data must check the session itself: `requireVolunteer()` from `lib/volunteer/guard.ts` in pages/actions, or `getVolunteer()` from `lib/auth/session.ts` returning 401 in route handlers. Layout checks do not protect API routes or server actions. See `CLAUDE.md` (Volunteer login) for managing admins.
