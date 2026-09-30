@AGENTS.md

# Can Drive

## Project and working style

- Build a single-school Can Drive application for Assumption College Catholic Secondary School in Windsor, Ontario. Approximately 1,100 students; roster size is not concurrent traffic.
- Priorities: accurate donation records, fast volunteer entry, clear public progress and incentives, and anonymous street-collection reservations. Keep operating costs and maintenance low.
- The owner has experience with Next.js, React, Python, APIs, and SQL. Explain consequential decisions and tradeoffs concisely; skip basic programming tutorials unless asked. Challenge assumptions when evidence warrants it.
- Complete the requested work and verify it. Make routine, reversible implementation decisions independently. Ask focused questions when an unresolved business rule materially changes correctness; continue independent work meanwhile.
- Keep changes scoped. Avoid microservices, queues, caches, extra services, or generic abstractions without a concrete requirement. No AI feature is needed.

## Repository orientation

- Before editing, inspect the relevant code, package scripts, lockfile, migrations, and existing tests. Follow the repository's actual conventions and installed versions.
- Current state: Next.js 16 / React 19 / Tailwind v4 app (pnpm). The public homepage reads live totals from Supabase through `getHomepageData()` (ISR, 60s); Grade Wars (`lib/grade-wars/`, `components/home/grade-wars/`) is still demo data behind `GradeWarsRepository`, and fetches in the browser rather than through `getHomepageData()`. The volunteer workspace (`/volunteer`, `/volunteer/log`) runs behind `VolunteerRepository` (`lib/volunteer/`). With `NEXT_PUBLIC_VOLUNTEER_DATA_SOURCE=supabase` it reads the real `students` table and reads/writes `donation_logs` through route handlers under `app/api/volunteer/` (`lib/volunteer/logs.server.ts`, `supabase-repository.ts`); with `mock` (default) everything is fictional and in memory. `/volunteer` and those routes require an admin login (see Volunteer login below). The app is connected to Supabase project `gcrfsdmkcfywkofhijsi`, which holds `students` (the real roster), `donation_logs` and `admin` (volunteer logins). All three have RLS enabled and no policies, so they are server-only.
- Supabase: use `@supabase/ssr` + `@supabase/supabase-js`. Use `lib/supabase/server.ts` for request-scoped clients (RLS applies), `lib/supabase/client.ts` for the browser, and `lib/supabase/admin.ts` only in server code that checks authorization itself (it bypasses RLS). `proxy.ts` refreshes the session cookie. Env vars live in `.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET`.
- Migrations live in `supabase/migrations` (Supabase CLI via `pnpm exec supabase`). The baseline migration mirrors the schema that was created by hand on the remote project. Unapplied schema drafts live in `supabase/drafts/` so `db push` cannot pick them up. Regenerate `lib/supabase/database.types.ts` after schema changes.
- Architecture and design decisions live in `docs/architecture.md`, which is rendered at `/docs`. Update it when a decision changes.
- `notes/` holds the owner's learning notes on the general computer science behind the app (trust boundaries, sessions/JWTs, RLS, migrations, Docker). Keep them framework-agnostic and update them when a change makes one inaccurate.
- Recommended architecture: a focused Next.js/TypeScript application with Supabase/Postgres and Vercel hosting. Keep this school's Supabase project separate from Lemma. Do not migrate an existing stack merely to match this recommendation.
- Discover development, lint, typecheck, test, and build commands from the repository; do not invent scripts or claim unrun commands passed. Once verified, record the useful commands here.
- Verified commands: `pnpm dev`, `pnpm lint`, `pnpm build`, `pnpm test` (Vitest), and `pnpm exec tsc --noEmit`. Run tsc after a build or `next typegen`, because `LayoutProps`/`PageProps` are generated types.
- Check current official documentation when using unfamiliar or version-sensitive framework, authentication, database, or deployment APIs. Use relevant installed skills selectively.

## Frontend conventions

- Design tokens (colours and fonts) are defined once in `app/globals.css` under `@theme`. Use the token classes (`bg-ink`, `text-tomato`, `font-display`) instead of raw hex values. Multi-stop effects are named `@utility` classes in the same file.
- The homepage is one responsive component tree, not separate mobile and desktop pages. Base styles follow the 390 design, `lg` is the desktop header and type, and `xl` is the side-by-side section layouts.
- Components are server components by default. On the homepage only interactive sections (`site-header`, `standings`, `zone-map`) and the small `teacher-room` toggle are client components; the volunteer workspace UI (`components/volunteer/`) is client-side and gets data only through the hooks in `lib/volunteer/provider.tsx`, never by importing a repository implementation. Keep shared constants in `lib/`, not in `"use client"` modules.
- All homepage figures come from `getHomepageData()` (`lib/homepage.server.ts`), called once in `app/page.tsx`. It reads rows with the admin client and returns only aggregates, built by the pure, tested `buildHomepageData()` (`lib/homepage.ts`). Its result reaches the browser, so adding a field is a publishing decision: no private rows, student IDs or full student names (top donors are "First L."). Homerooms are labelled by teacher surname (owner's decision), with the room code shown on click. Can-equivalents round down per student, then sum to homeroom and school. Fixed drive details (goal, dates, desk, contact) live in `DRIVE` in `lib/site.ts`.

## Donation workflow and user experience

- Primary volunteer flow: find student → confirm name and homeroom → enter contribution → save → move to next student.
- Support keyboard use, clear focus, visible saving/error states, and quick repeated entry. Keep the entered values available after failures and show success only after the write is confirmed.
- Distinguish students with identical names using homeroom/grade and internal ID. Never treat a name as a unique identifier.
- Prevent duplicate credit from double clicks, retries, and lost responses. Disabling the submit button alone is insufficient; use a stable submission identifier and a database uniqueness guarantee. Reuse the identifier on retry and reject conflicting payloads.
- Corrections are direct overwrites of a log (owner's decision): no correction reason, no history UI. Totals are always computed from logs, so edits adjust every total consistently. Deleting a log is a real `DELETE` of the row (owner's decision): no void flag, history or reason; totals re-sum on their own. Never store or edit a student's total.
- Public pages should make school progress, homeroom standings, and approved incentives easy to understand. Design responsively with accessible labels, contrast, focus states, and readable errors. Use supplied branding when available.

## Data rules

- Inspect existing migrations before changing the schema.
- Store contributions as individual records. Compute student, homeroom, grade, and school totals from valid donation records; do not maintain an independently editable cumulative count on `students`.
- Keep physical cans and money separate. `cans` records require a positive integer `can_count` and NULL `amount_cents`. `cash`/future `online` records require positive integer `amount_cents` and NULL `can_count`. Enforce valid methods and amounts in the database as well as at the input boundary.
- Use integer cents for money. Label physical cans and can-equivalent totals accurately. Define rounding before converting fractional dollars to reward equivalents.
- One donation row represents one method. If a single submission includes both cans and cash, save its rows atomically and make the whole submission retry-safe.
- Use `timestamptz` for instants. `occurred_at` is the effective donation time; `recorded_at` is the entry time. Use `America/Toronto` for local days, deadlines, and display; never hard-code a UTC offset.
- UUIDs do not themselves prevent duplicate payments. Online payments are a future feature: credit verified successful payments only, deduplicate provider events/payments, and define refund handling before including them in totals.
- Keep schema changes reproducible in version-controlled migrations, following the repository's existing migration workflow. Test constraints, authorization, and relevant concurrent writes against Postgres.

## Access and privacy

- Students do not need accounts. Trusted volunteers and organizers need protected access; the owner decides who receives it.
- The owner's stated preference is a shared volunteer account. Avoid silently introducing a larger account-management system. A shared login cannot identify which volunteer performed an action.
- Verify authorization at every protected server/database entry point. Being signed in alone must not confer volunteer or organizer privileges. UI visibility is not access control.
- Enable RLS on tables in exposed Supabase schemas and make grants/policies match the intended roles. Keep secret/service-role keys server-side. Privileged server code must enforce authorization explicitly.

### Volunteer login

Simple admin login, deliberately without Supabase Auth or an auth library. Details and tradeoffs: `docs/architecture.md` (Volunteer login) and `notes/10-password-login.md`.

- `public.admin` (`username`, bcrypt `password_hash`) is the list of people allowed into `/volunteer`. There are no roles: every row is a full volunteer/admin.
- `/login` → server action `login()` (`app/login/actions.ts`) → `verify_admin(username, password)` via the admin client. Only `service_role` may execute it. On success it sets `volunteer_session`, an HMAC-signed, `HttpOnly` cookie lasting 12h (`lib/auth/`).
- **Every entry point checks for itself:** pages and layouts use `requireVolunteer()` (`lib/volunteer/guard.ts`, redirects to `/login`). Route handlers and server actions touching volunteer data use `getVolunteer()`/`requireVolunteer()` at the top (routes return 401). A layout check does not protect actions or API routes.
- `SESSION_SECRET` (32+ characters, `openssl rand -base64 32`) must be set in `.env` and in Vercel. Rotating it signs everyone out. Without it, auth throws (fails closed).
- Manage admins in the Supabase SQL editor. Usernames are lowercase `a-z 0-9 _ -`, 3 to 40 characters:
  - Add: `select public.add_admin('desk', 'a-long-password');`. This hashes with bcrypt, lowercases the username and requires 12+ characters. It can only be run from the SQL editor, not by the app. The equivalent raw insert is `insert into public.admin (username, password_hash) values ('desk', extensions.crypt('a-long-password', extensions.gen_salt('bf', 12)));`
  - Change password: `update public.admin set password_hash = extensions.crypt('new-password', extensions.gen_salt('bf', 12)) where username = 'desk';`
  - Remove: `delete from public.admin where username = 'desk';`. Existing sessions last until they expire (≤12h); rotate `SESSION_SECRET` to cut them off now.
- Known limits: no rate limiting or lockout (use long passwords), no per-volunteer accountability with a shared login, no reset UI.
- Individual student records and donation histories are private. Public responses should expose only intended aggregates and reservation availability. Do not send private rows to the browser and hide them in the UI.
- Verify views/functions and aggregate endpoints do not create a path to private records. Keep reservation contact details and edit credentials out of public responses.

## Feature rules (loaded on demand)

Detailed rules for these features live in project skills: `roster-import`, `incentive-rules`, and `street-reservations` (`.claude/skills/`). Read the matching one before working on that feature. These always apply:

- Use synthetic students in committed fixtures, screenshots, and tests. Keep the real roster and identifiable donation records out of public repositories and logs.
- Never blindly append or recreate students with donation history on a repeated roster import.
- The four rewards and $1 = 1 can are confirmed as shown on the homepage (owner, 2026-09-29; see the `incentive-rules` skill). Details they don't state (cutoff times, ties, qualification order) are not; never invent policy to fill those gaps.

## Verification and completion

- Test the behavior changed. Prioritize wrong-student entry, invalid amounts, duplicate submissions/retries, simultaneous saves, correction totals, unauthorized access, private-data exposure, and Toronto date boundaries when relevant.
- For reservation changes, verify concurrent conflicts and local-date expiry. For reward changes, test approved thresholds, ties, and cutoff behavior.
- Use local/test data for development. Exercise changed UI flows in a browser when available, including failure/retry behavior; visual inspection alone does not verify persistence.
- Run the applicable existing checks. If a check cannot run, report the limitation and what remains unverified. Add tests for meaningful failure cases rather than tests that merely duplicate implementation details.
- Before production data migrations, confirm the target and use an appropriate backup/recovery plan. Do not reset or truncate real data to fix development problems.
- Finish with what changed, why, verification performed, and any unresolved limitation. Keep durable project decisions current; keep task-by-task logs out of this file.

