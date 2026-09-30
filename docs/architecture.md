# Architecture and design decisions

This is the running record of how the Can Drive site is built and why. Update it when a decision changes. Business rules and data constraints live in `CLAUDE.md`. This file covers the technical and design choices made to satisfy them.

_Last updated: 2026-09-29. Current scope: the public homepage, which reads live totals from Supabase, and the volunteer workspace (`/volunteer`), which searches the real `students` table and saves to `donation_logs`. The collection map is still a schematic placeholder. `/volunteer` and its API require an admin login (see [Volunteer login](#volunteer-login))._

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack) | Server components by default. Client components only where state is needed. |
| UI | React 19.2, TypeScript (strict) | |
| Styling | Tailwind CSS v4 | Tokens live in `app/globals.css` via `@theme`. There is no `tailwind.config`. |
| Fonts | `next/font/google` | Self-hosted at build time, so there are no runtime requests to Google. |
| Docs rendering | `react-markdown` + `remark-gfm` | Renders this file at `/docs`. |
| Tests | Vitest + Testing Library (jsdom) | `pnpm test`. Unit tests for pure modules; component tests for the log flow. |
| Hosting (planned) | Vercel | |
| Data | Supabase/Postgres via `@supabase/ssr` + `@supabase/supabase-js` | See [Supabase connection](#supabase-connection). |
| Volunteer auth | `public.admin` table (bcrypt via `pgcrypto`) + HMAC-signed cookie | No auth library. See [Volunteer login](#volunteer-login). |

## Source of the design

The homepage is a port of the claude.ai/design file **Can Drive Homepage.dc.html** (“The Can” concept). It has two artboards, desktop 1440 and mobile 390. The design file uses its own template runtime (`support.js`, with `<sc-for>`, `{{ }}` bindings and `style-hover`). None of that runtime was ported. Its markup and its small `DCLogic` state class were rewritten as React components.

## Page structure

```
app/
  layout.tsx          fonts, metadata, <html lang="en-CA">
  page.tsx            homepage: calls getHomepageData() once, passes props to the sections (ISR, 60s)
  globals.css         design tokens, base styles, effect utilities
  docs/page.tsx       renders docs/architecture.md
components/
  can.tsx             the CSS can (progress meter + podium block)
  ticket.tsx          torn-stub reward ticket
  marks.tsx           marker underline, school crest (public/acslogo.png)
  home/               one file per homepage section
lib/
  homepage.server.ts  getHomepageData(): reads Supabase, the only source of homepage figures
  homepage.ts         types, buildHomepageData() (pure aggregation), display helpers
  demo-data.ts        the collection map's schematic zone grid (still demo)
  site.ts             nav links, content-width class, fixed drive details (DRIVE)
docs/
  architecture.md     this file
```

### Server vs. client components

Only three components ship JavaScript. Everything else renders to static HTML.

| Component | Why it is a client component |
| --- | --- |
| `home/site-header.tsx` | Mobile menu open/close, including closing on Escape. |
| `home/standings.tsx` | Search, selection and the full-list toggle. |
| `home/zone-map.tsx` | Zone selection. |

The homepage prerenders as a static route (`○` in `next build`) and revalidates at most once a minute (see Data boundary).

## Responsive strategy: one tree, not two artboards

The design draws desktop and mobile as separate artboards. The site renders a **single component tree** with Tailwind breakpoints. The base styles follow the mobile artboard. Keeping one tree means one copy of every string, one state object and one set of anchor IDs.

- **`lg` (1024px)** switches to the desktop header, desktop type sizes and spacing.
- **`xl` (1280px)** switches to the side-by-side layouts: the hero's big can, the incentive ticket columns, the standings table plus detail card, the donors podium column, and the how-to-give columns. These need about 1280px. At 1024 they overlapped, so tablets get the stacked versions instead.
- Content is capped at 1440px (`WRAP` in `lib/site.ts`) with the design's 20px / 64px gutters.
- The hero headline is sized as `min((100vw − 40px) / 5, 6.5rem)` so that “SMALL CANS.” always fits on one line on phones. Other display headings use `clamp()`.
- Where the mobile structure genuinely differs, both versions render from the same data and state, and CSS shows one. For example, the standings rows expand as an accordion on mobile but drive a pinned detail card on desktop, and how-to-give is a timeline on mobile and three columns on desktop. Where mobile copy was only a shortened version of the desktop copy, the site uses the desktop copy everywhere.
- `main` uses `overflow-x: clip` because the tilted tickets' corners would otherwise cause horizontal scroll. This matches the artboard's `overflow: hidden`.

Checked at 320, 390, 768, 1024, 1280 and 1440 with no horizontal scroll.

## Visual system

**Palette.** Warm paper and ink, with two accents taken from a soup-can label: tomato (homeroom and goal) and butter yellow (highlight and “open”). These are **not** assumed school colours. Swap them once branding is supplied. The palette is fixed, so there is no dark mode: the dark standings and footer bands are part of the design, and an OS-level inversion would break the paper/ink concept.

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#1B1A17` | Text, rules, dark sections |
| `paper` | `#F4EEE2` | Page background |
| `kraft` | `#E9E0CD` | Alternate section background |
| `tomato` | `#C8432A` | Goal, homeroom rewards, “school” zone |
| `butter` | `#F2C230` | Highlights, selection, focus ring, “open” zone |
| `muted` / `body` / `rule` | `#5B554B` / `#3A362F` / `#CFC5B0` | Secondary text and lines |

**Type.**
- *Big Shoulders* for scoreboard headlines and numbers. Google merged “Big Shoulders Display” into this variable family, and its optical-size axis produces the display cut at large sizes.
- *Instrument Sans* for body text.
- *Permanent Marker* only for hand-written margin notes.
- System monospace for labels.

**Motif.** The can is the progress meter: large in the hero and small on the homeroom card. Rewards are torn-stub tickets, notes are marker scribbles. (A rubber-stamp mark flagged demo figures and unconfirmed rules; it was removed once the data went live and the rules were confirmed.)

**Effects** that would be unreadable as Tailwind arbitrary values are named utilities in `globals.css`: `ticket-mask`, `can-ribs`, `can-lid`, `hatch`, `progress-stripes` and `stub-label`. They are declared with `@utility`, so responsive variants like `lg:can-lid` work.

## Volunteer workspace

`/volunteer` (dashboard: look up a student, see logs and totals, fix a log) and `/volunteer/log` (the entry flow). All data goes through a repository interface; with the `supabase` data source it reads and writes the real tables through route handlers.

```
app/volunteer/          layout (login guard, noindex, shell), dashboard page, log page
components/volunteer/   workspace UI (all client components)
lib/volunteer/
  types.ts              Student, DonationLog, NewLog, LogPatch, ... (camelCase, id as string)
  repository.ts         VolunteerRepository interface + SubmissionConflictError
  mock-repository.ts    in-memory log store (fake latency, failNextWrite, reset); students from a StudentDirectory
  roster-directory.ts   StudentDirectory that calls the roster routes below (browser side)
  roster.server.ts      server-only: reads `students` with the admin client, in pages
  logs.server.ts        server-only: reads/writes `donation_logs`, validates request bodies
  supabase-repository.ts  the real repository (browser side): fetch()es the routes below
  index.ts              wires the repository from NEXT_PUBLIC_VOLUNTEER_DATA_SOURCE
app/api/volunteer/students/        GET ?q=   → search results
app/api/volunteer/students/[id]/   GET       → one student
app/api/volunteer/logs/            GET ?studentId=, POST   (see Donation logs)
app/api/volunteer/logs/recent|totals|[id]/
  provider.tsx          context + hooks; UI never imports an implementation
  search.ts, validation.ts, money.ts, time.ts, log-flow.ts   pure, unit-tested
supabase/drafts/volunteer_workspace.sql   schema additions, not applied
```

**The repository seam.** Components call hooks (`useStudentSearch`, `useCreateLog`, …) that read the repository from context. `NEXT_PUBLIC_VOLUNTEER_DATA_SOURCE` picks the data without UI changes:

| Value | Students | Logs |
| --- | --- | --- |
| `mock` (default) | 30 fictional seed students | Seeded, in memory |
| `supabase` (set in `.env` locally) | Real `students` table | Real `donation_logs` table |

`StudentDirectory` (search, get) is a smaller seam: the mock can take the real roster through it, and `SupabaseVolunteerRepository` reuses `RosterDirectory` for its student calls. Prototype controls (make the next save fail, reset) only exist with `mock`. There is no data-fetching library: a `revision` counter in the provider is bumped after every successful write, and every query refetches when it changes. That is enough for one volunteer screen at a time and avoids a dependency.

**Edits are direct overwrites.** The owner decided volunteers fix a log by editing it in place: no correction reason, no history UI, no void/reversal rows. There is no `updated_at` column yet (MVP: no schema change), so the API returns `recorded_at` as both `createdAt` and `updatedAt`; the "Updated" chip after an edit comes from client state. `supabase/drafts/volunteer_workspace.sql` still has the column and trigger if it's wanted later. Totals are always sums of logs, never stored, so an edit changes every total consistently. Logs are never deleted; the planned RLS has no delete policy.

**Retry-safe creates.** Every entry gets a client-generated UUID when the student is picked. It is reused on "Try again" and becomes `donation_logs.transaction_id`, the primary key. A retry after a lost response therefore hits the same key: same payload returns the existing row, a different payload is rejected (`SubmissionConflictError`). A disabled button can't cover a response lost in transit; the key can. The mock implements the same rule, with tests.

**Search.** Exact matches are word-prefix matches on the normalized name (lowercase, no accents or apostrophes). Near spellings (edit distance, max 4, only for queries of 4+ characters) are shown under "Similar spelling", identical names get a "Same name" chip, and the confirm block lists lookalikes in the school. The same function (`lib/volunteer/search.ts`) runs in the browser for seed data and on the server for the real roster. Exact matches are capped at 20 per response (`EXACT_LIMIT`), with the full count returned as `exactTotal` so the list can say "20 of 321 matches".

**Log flow state** is one reducer (`idle | saving | failed | saved`). While saving, every other action is ignored, and a ref guards against two saves starting in one render. A failure keeps every value and focuses "Try saving again"; success only shows once the write resolves.

**Privacy.** Seed data is fictional. Full student names only exist in `/volunteer` responses. The homepage shows only today's top donors as "First L." (see Data boundary). The layout sets `robots: noindex, nofollow`. The guard (`lib/volunteer/guard.ts`) requires an admin login for both data sources; see [Volunteer login](#volunteer-login).

**Times** display in `America/Toronto`; "Today" means the Toronto calendar day.

### Roster search (real students)

How a name search reaches the database:

```
browser (StudentSearch, 150 ms debounce)
  → RosterDirectory: GET /api/volunteer/students?q=…      (no-store)
  → route handler → loadRoster() with the admin client     (server only, bypasses RLS)
  → searchStudents(roster, q) → at most 20 exact + 4 similar, name/grade/homeroom only
```

- **Route handlers, not server actions.** Next.js runs server actions one at a time per browser, and its docs recommend route handlers for reads. Search-as-you-type needs independent GETs.
- **Whole roster, then search in memory.** About 1,100 rows is small, so each request reads the table and runs the same rules as the mock. That needs no schema change (no `pg_trgm` yet). Revisit if the roster grows a lot or search feels slow.
- **Paging gotcha.** Supabase's API returns at most 1,000 rows per request, and the roster has 1,113, so `loadRoster()` reads in pages of 1,000. Without this, 113 students would silently never appear. This is tested, and was checked live: the highest-id students are findable.
- **Minimum data out.** `hr_teacher` is never selected. Responses carry only id, names, grade and homeroom, with `Cache-Control: private, no-store`.
- **Failures are not "no match".** If the request fails, the search box says search isn't working and offers "Search again", and Enter can't pick from an older list. Showing "no student matches" on a network error could push a volunteer to log under someone else.
- **Login check in each route.** Both handlers call `getVolunteer()` first and return 401 without a valid session. The layout check doesn't cover them, because an API route is a separate URL.

### Donation logs

```
browser (SupabaseVolunteerRepository, fetch)
  → /api/volunteer/logs…  → getVolunteer() or 401 → validate body or 400
  → logs.server.ts with the admin client (server only, bypasses RLS) → donation_logs
```

| Route | Request | Response |
| --- | --- | --- |
| `GET /api/volunteer/logs?studentId=` | | `DonationLog[]`, newest first |
| `GET /api/volunteer/logs/recent?limit=` | limit 1–100, default 10 | `LogWithStudent[]` (id, names, grade, homeroom only) |
| `GET /api/volunteer/logs/totals?studentId=` | | `StudentTotals`, summed from the rows |
| `POST /api/volunteer/logs` | `NewLog` | `DonationLog`; 400 invalid or unknown student; 409 reused id with a different donation |
| `PATCH /api/volunteer/logs/[id]` | `LogPatch` | `DonationLog`; 400; 404 |

- **Retry-safe create in the database.** The insert uses the browser's submission id as `transaction_id`. A second insert hits the primary key (Postgres `23505`); the server reads the existing row and returns it if student, method and amount match, else 409. Checked live: a response dropped after the insert, then "Try again", left one row; five simultaneous POSTs with one id left one row.
- **Validation twice.** The route rejects bad bodies (UUID id, numeric student id, `cans`/`cash`, whole number within the UI's limits) before any query; the `amount_matches_method` check constraint rejects anything that slips past (checked: zero, wrong field, both fields, unknown method, unknown student all fail).
- **Totals are computed, not stored.** `totals` sums `can_count` and `amount_cents` for the student on each request and converts with `canEquivalents()`, so an edit changes every total at once. A student has a handful of rows, so there is no view or cache.
- **`online` rows are excluded** from every read and from edits until online payments and refunds are defined.
- **Mapping:** `transaction_id`→`id`, `can_count`→`cans`, `amount_cents`→`cashCents`, `recorded_at`→`createdAt`/`updatedAt`, `student_id` (bigint)→string.
- **Still to do:** volunteer RLS policies (today everything is server-only through the admin client, which is enough for a shared login), and `occurred_at` is always the insert time.

### Volunteer login

```
/login form → server action login()
  → admin client: rpc verify_admin(username, password)   (bcrypt compare inside Postgres)
  → true: set cookie volunteer_session = username.expiresAt.HMAC   → redirect /volunteer
/volunteer layout → requireVolunteer()   → no valid cookie: redirect /login
/api/volunteer/*  → getVolunteer()       → no valid cookie: 401
```

- **`public.admin` table** (`supabase/migrations/20260929000000_admin_login.sql`): `username` (lowercase `a-z 0-9 _ -`, 3 to 40 characters) and a bcrypt `password_hash` from `pgcrypto`. A check constraint rejects anything that isn't a bcrypt hash. RLS is on with no policies, and `anon`/`authenticated` have no grants.
- **`add_admin(username, password)`** (`20260929010000_add_admin.sql`) hashes the password and inserts the row, so admins are added with `select public.add_admin('desk', '…')`. It requires 12+ characters. No API role can execute it, so it runs only from the SQL editor.
- **`verify_admin()` is executable only by `service_role`.** The publishable key can't call it to guess passwords. Unknown username and wrong password both return `false` and show the same message.
- **Why not Supabase Auth.** The owner wanted a plain table of admin logins. Supabase Auth would add email-based users, JWTs and role claims for what is, for now, a shared desk login. The `proxy.ts` session refresh stays for when Supabase Auth is used.
- **Why pgcrypto instead of an npm hashing package.** An admin can be added with one SQL statement, and there's no dependency or hashing script.
- **Session: stateless signed cookie** (`lib/auth/token.ts`, `lib/auth/session.ts`). The cookie is an HMAC-SHA256 over `username.expiresAt` with `SESSION_SECRET`, is `HttpOnly`, `SameSite=Lax` and `Secure` in production, and lasts 12 hours. There's no sessions table. The tradeoff: deleting an admin doesn't end their current session until it expires, and rotating `SESSION_SECRET` signs everyone out. Missing or short secrets throw, so the check fails closed.
- **Rule:** every server action or route handler that touches volunteer data calls `requireVolunteer()` or `getVolunteer()` itself.
- **Not built:** rate limiting or lockout, per-volunteer accounts, roles, and a password-reset UI. A shared login can't identify which volunteer made an entry.
- **Verified:**
  - Database: right and wrong passwords, unknown user, username case and whitespace, plaintext rejected, `anon`/`authenticated` without select or execute.
  - Unit tests for the token: tampering, a different secret, expiry and malformed input.
  - Browser: redirect when signed out, error that keeps the username, sign-in, the cookie is `HttpOnly`, sign out, and a tampered cookie is rejected.
  - curl: 401 from both API routes when signed out.

## Supabase connection

| File | Key | RLS | Use |
| --- | --- | --- | --- |
| `lib/supabase/server.ts` | Publishable + session cookie | Applies | Server components, server actions, route handlers |
| `lib/supabase/client.ts` | Publishable | Applies | Client components (nothing needs it yet) |
| `lib/supabase/admin.ts` | Secret, `server-only` | Bypassed | Server code that has already checked authorization, and `getHomepageData()`, which returns only public aggregates |
| `proxy.ts` → `lib/supabase/proxy.ts` | Publishable | n/a | Refreshes the auth cookie with `getClaims()` on each request |

- **Why not `@supabase/server`:** it's a public-beta package built for header-based backends such as Edge Functions. In Next.js it still needs `@supabase/ssr` for cookies, plus hand-rolled JWKS caching. The supabase-js `auth.getClaims()` call already verifies JWTs.
- **Current access:** `students` and `donation_logs` have RLS enabled with no policies, so publishable-key requests see no rows and can't write (verified: `students` returns 0 of 1,113 rows, and an insert is rejected with 42501). All data access goes through server code, which checks the volunteer login itself. `admin` is server-only in the same way.
- **Schema source:** the tables were created directly on the remote project. `supabase/migrations/20260927000000_baseline_schema.sql` reproduces them, and `lib/supabase/database.types.ts` is generated from the live schema.

## Data boundary

The homepage reads **live data** from Supabase. Every figure comes from **`getHomepageData()`** in `lib/homepage.server.ts`. `app/page.tsx` calls it once and passes plain props down; no section imports data itself.

```
students + donation_logs  --admin client (server only)-->  getHomepageData()
   (private rows)                                             |  buildHomepageData(): sums, groups, top 8 today
                                                              v
                                   { goal, total, homerooms[], topDonors[] }  -->  page (static, rebuilt at most once a minute)
```

- **How:** `loadRoster()` (paged, reused from the volunteer desk) plus a keyset-paged read of `donation_logs` (`cans` and `cash` only; `online` stays out until refunds are defined). The aggregation is a pure function, `buildHomepageData()` in `lib/homepage.ts`, unit-tested on synthetic students in `lib/homepage.test.ts`.
- **Why in TypeScript, not SQL:** it needs no migration and reuses the one rounding rule (`canEquivalents()`) instead of copying it into SQL. Reading about 1,100 students plus a few thousand logs at most once a minute is cheap. If volume ever grows, the upgrade is one SQL function that returns the same JSON, called from the same place.
- **Rounding rule:** each student's total is `canEquivalents(cans, cents)` (partial dollars round down, per student). A homeroom's total is the sum of its students' totals, and the school total is the sum of the homerooms. Every level matches the volunteer dashboard.
- **Homerooms** are the roster's `hr` values, all 58 of them, including tiny or non-class codes like `Office` or 1-student rooms (the owner's decision; a 1-student room's total reveals that student's amount). Many mix grades, so each has `grades: number[]` ("Grades 10, 11, 12"), and "grade 9" in the search matches any homeroom with a grade 9 student. They're sorted by total, then by room code.
- **Top donors:** students with the highest can-equivalents **today** (America/Toronto day of `occurred_at`), top 8, shown as **first name + last initial** (owner's decision). Ties are ordered by name for display only; the lunch-voucher tie rule is unconfirmed.
- **What is public:** the result is serialised into the page, because `Standings` is a client component. It contains only aggregates and today's top donors ("First L.", homeroom, total): no student IDs, full surnames, teachers or individual logs. Checked: the rendered page contains no `student_id` or `hr_teacher`, and no roster surname other than ordinary words already in the page copy.
- **Freshness:** `export const revalidate = 60` (ISR). The page is served from cache and rebuilt in the background at most once a minute, so a saved donation shows up within about a minute. If a rebuild fails (for example, Supabase is down), the last good page keeps being served. `next build` also queries Supabase, so the env vars must be set wherever the site is built.
- **Why the admin client is acceptable here:** it bypasses RLS and this page has no login. That's safe only because the function returns public aggregates. Adding a field to its result is a publishing decision.

Fixed copy that isn't data lives in `DRIVE` in `lib/site.ts`: the goal (20,000 can-equivalents), drive dates, desk location and hours, and organizer contact. `lib/demo-data.ts` now holds only the collection map's schematic zone grid, which is still undecided.

Display helpers used by the client standings are in `lib/homepage.ts`: `homeroomStats` (dodgeball target, percentage, real cans/cash split, status), `matchesQuery` and `gradeLabel`. Move the reward maths into the single incentive-calculation module that `CLAUDE.md` requires once the rules are confirmed.

**Rewards are confirmed** (owner, 2026-09-29), as shown on the page: $1 = 1 can; dress-down day at 10 cans or $10; lunch vouchers for the top 3 donors each day; a pizza party for the #1 homeroom; dodgeball for the first 20 homerooms to reach 10 cans per student. Public figures are labelled "cans" everywhere (hero and podium) even though they are can-equivalents, by the owner's choice, because it reads more cleanly; the hero copy explains $1 = 1 can. The site shows progress toward these rewards but doesn't decide winners: ties, cutoff times and the order in which homerooms qualify for dodgeball are for the organizers.

### Hero meter

Both meters derive the fill, the count and the notes from `(goal, total)` in one place (`progress()` in `hero.tsx`). The percentage is floored, so it never shows 100% while cans are still to go. The fill caps at the rim, and past the goal the notes read “Goal reached! +N over”. On desktop the can's inner box and the tick column are both 300px, so the fill maps 1:1 to the scale, and a pointer sits exactly on the fill line. Each meter is `role="img"` with a full `aria-label`.

## Accessibility

- Skip link to `#main`, landmark `header` / `main` / `footer`, and labelled `nav`s.
- Every section has a heading, and there is one `h1`.
- A visible focus ring on every focusable element (butter outline with an ink halo), as specified in the design.
- Standings rows are buttons with `aria-pressed` and a full `aria-label` (room, grade, rank, total). The result count, empty state and desktop detail card are `aria-live="polite"`.
- Zone cells are buttons with `aria-pressed` and labels like “Zone B2, open”. The school cell is `disabled`. The legend adds a hatch pattern, so taken vs. open doesn't depend on colour alone.
- The mobile menu button has `aria-expanded` and `aria-controls`, and Escape closes the menu.
- Smooth anchor scrolling only applies under `prefers-reduced-motion: no-preference`.

## `/docs` route

`app/docs/page.tsx` reads `docs/architecture.md` from disk at build time and renders it with `react-markdown` and GitHub-flavoured markdown. The route is static and marked `noindex`. The markdown file stays the single source, readable on GitHub as well.

`@next/mdx` was not used. It needs `next.config` and `mdx-components.tsx` changes, and the Next 16 docs describe `.md` handling for webpack, whereas Turbopack is the default.

## Deliberately not built yet

- Reservations. Auth is a single admin login table (see Volunteer login).
- The design-tool runtime (`support.js`).
- Dark mode (see Visual system).

## Open items

| Item | Needed from | Notes |
| --- | --- | --- |
| Branding | Owner | Decided: keep the tomato/butter palette. The Assumption College crest is in the header and footer. |
| Desk days | Owner | The desk runs Oct 5–23, 7:30–8:10 a.m. It isn't confirmed whether that's every school day. |
| Volunteer admins | Owner | Add the real admin logins in the SQL editor (see `CLAUDE.md`), and set `SESSION_SECRET` in Vercel before deploying. |
| Log search/indexes and `updated_at` | Build | Logs are in `donation_logs`. `supabase/drafts/volunteer_workspace.sql` (indexes, `updated_at`, Postgres name search) is optional until volume or audit needs call for it. |
| “Choose a collection area” flow | Owner + build | The link is `#`. The area model and booking rule are undecided, and the grid is a schematic placeholder. |
| Incentive details | Organizers | The rewards are confirmed. Still open, if the site should ever decide winners: daily cutoff times, ties, and how the dodgeball qualification order is recorded. |
| Baseline migration history | Owner | `supabase/migrations/20260927000000_baseline_schema.sql` is already applied on the remote project but isn't recorded there. Run `pnpm exec supabase login`, then `link --project-ref gcrfsdmkcfywkofhijsi`, then `migration repair --status applied 20260927000000`. |
