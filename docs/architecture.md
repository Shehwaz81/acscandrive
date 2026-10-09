# Architecture and design decisions

This is the running record of how the Can Drive site is built and why. Update it when a decision changes. Business rules and data constraints live in `CLAUDE.md`. This file covers the technical and design choices made to satisfy them.

_Last updated: 2026-10-02. Current scope: the public homepage, which reads live totals from Supabase, the public [Student Standings](#student-standings-students) page (`/students`, which reads the real roster and donation logs), and the volunteer workspace (`/volunteer`), which searches the real `students` table and saves to `donation_logs`. The collection map is a Google street picker with no booking yet (see [Collection map](#collection-map)). `/volunteer` and its API require an admin login (see [Volunteer login](#volunteer-login))._

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
| Maps | Google Maps JavaScript API + Places API (New), loaded at runtime | Browser key, restricted by referrer and API. See [Collection map](#collection-map). |
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
  students/page.tsx   Student Standings: calls getStandingsData() once (ISR, 60s); error.tsx is its failed state
components/
  can.tsx             the CSS can (progress meter + podium block)
  ticket.tsx          torn-stub reward ticket
  marks.tsx           marker underline, school crest (public/acslogo.png)
  home/               one file per homepage section (grade-wars/ is a folder: section, date panel, podium, breakdown)
lib/
  homepage.server.ts  getHomepageData(): reads Supabase, the only source of homepage figures
  homepage.ts         types, buildHomepageData() (pure aggregation), display helpers
  collection-area.ts  the street check for the collection map (Essex County, whole streets, no highways)
  grade-wars/         Grade Wars: types, rankDay(), repository interface, mock, Supabase stub, useGradeWars()
  site.ts             nav links, content-width class, fixed drive details (DRIVE)
docs/
  architecture.md     this file
```

### Server vs. client components

Only four homepage sections ship JavaScript. Everything else renders to static HTML.

| Component | Why it is a client component |
| --- | --- |
| `home/site-header.tsx` | Mobile menu open/close, including closing on Escape. |
| `home/standings.tsx` | Search, selection and the full-list toggle. |
| `home/collection-map.tsx` | Loads Google Maps and holds the picked street. |
| `home/grade-wars/grade-wars.tsx` | Fetches daily grade results in the browser and holds the selected day. |

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
| `tomato` | `#C8432A` | Goal, homeroom rewards |
| `butter` | `#F2C230` | Highlights, selection, focus ring |
| `muted` / `body` / `rule` | `#5B554B` / `#3A362F` / `#CFC5B0` | Secondary text and lines |

**Type.**
- *Big Shoulders* for scoreboard headlines and numbers. Google merged “Big Shoulders Display” into this variable family, and its optical-size axis produces the display cut at large sizes.
- *Instrument Sans* for body text.
- *Permanent Marker* only for hand-written margin notes.
- System monospace for labels.

**Motif.** The can is the progress meter: large in the hero and small on the homeroom card. Rewards are torn-stub tickets and notes are marker scribbles.

**Effects** that would be unreadable as Tailwind arbitrary values are named utilities in `globals.css`: `ticket-mask`, `can-ribs`, `can-lid`, `progress-stripes` and `stub-label`. They are declared with `@utility`, so responsive variants like `lg:can-lid` work.

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

**Edits are direct overwrites.** The owner decided volunteers fix a log by editing it in place: no correction reason, no history UI, no void/reversal rows. There is no `updated_at` column yet (MVP: no schema change), so the API returns `recorded_at` as both `createdAt` and `updatedAt`; the "Updated" chip after an edit comes from client state. `supabase/drafts/volunteer_workspace.sql` still has the column and trigger if it's wanted later. Totals are always sums of logs, never stored, so an edit changes every total consistently. **Deletes are real deletes.** The owner decided a volunteer can delete a log (`DELETE /api/volunteer/logs/<id>`, 204): the row is removed with no void flag, history or reason, and totals re-sum on their own. Deleting a log that is already gone also returns 204, so a retry after a lost response is safe.

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

## Collection map

The `#map` section (`components/home/collection-map.tsx`) lets a student search for a street, see it on a Google map and **claim** it with their name and homeroom (see [Street claims](#street-claims)).

- **Components:** the Maps JavaScript API's `PlaceAutocompleteElement` (Places API New, GA), `google.maps.Map` and `AdvancedMarkerElement`, all created in an effect. No npm package ships to the browser (`@types/google.maps` is types only). The Extended Component Library's `gmpx-place-picker` was not used: it's pre-1.0 and needs an extra package or script for the same result.
- **Loading:** the client component adds the script once (`loadMaps()`), only when the section mounts, so only the homepage loads it. It uses `loading=async&callback=…` because `google.maps.importLibrary` exists only once Google calls the callback. `next/script`'s `onReady` fires at the load event, which is too early.
- **What is allowed** (owner, 2026-09-30): any **whole street** in **Essex County, Ontario** (Windsor, Tecumseh, LaSalle, Amherstburg, Lakeshore, Leamington and so on), except highways and expressways. Searching is restricted with `includedRegionCodes: ['ca']`, `locationRestriction` (a rectangle around the county) and `includedPrimaryTypes: ['route']`. The rectangle overlaps Detroit and Google still suggests some house addresses, so **`checkCollectionStreet()`** (`lib/collection-area.ts`, unit-tested) decides after each pick:
  - The place must be a `route` with country `CA`, province `ON`, and county "Essex County" (or locality "Windsor", which is administratively separate from the county).
  - Highways are rejected by name (expressway, highway/hwy, Herb Gray Parkway), because Google types them as ordinary routes.
  - A rejection clears the marker and shows a short message.
- **Start view:** centred on Assumption College (`SCHOOL_LOCATION`) at zoom 12. `gestureHandling: "cooperative"` makes one-finger drags scroll the page on phones instead of trapping it. The map is 320px tall on mobile and 480px from `lg`.
- **Fields fetched:** `types`, `addressComponents`, `location`, `viewport`. The display name isn't needed, because the street name comes from the `route` component.
- **Map ID:** Advanced Markers need one. `NEXT_PUBLIC_GOOGLE_MAP_ID` (vector, from Maps Management) is used. In development only, it falls back to Google's `DEMO_MAP_ID`.
- **Missing key or failure:** without a key (or, in production, a Map ID) the section renders a “not set up yet” message and loads nothing. A script error, an auth failure (`gm_authFailure`) or an init error shows “The map couldn't load”, and a failed search shows an inline message.

### Street claims

Owner's decisions (2026-09-30), deliberately the simplest booking that works. **Claims run on community and user trust:** nothing proves a student is who they pick.

- **Identity:** the student types part of their name and **picks themselves** from a suggestion list (an ARIA combobox). `GET /api/claims/students?q=` runs the volunteer desk's prefix search (`searchStudents()`) over the roster and returns at most 8 matches, each `{ ref, name: "Maya R.", homeroom: "10B" }`, only once 2 or more letters are typed. There's no homeroom field: the suggestion carries it. Identical labels ("Maya R. (10B)" twice) prompt "Keep typing your last name to narrow the list."
- **Student refs:** `ref` is the student id encrypted and authenticated with AES-256-GCM (`lib/claims-ref.ts`, key derived from `SESSION_SECRET`, unit-tested), so the browser can hand a student back without ever seeing an id, and can't forge or alter one. A ref the server can't open (for example after `SESSION_SECRET` is rotated) returns 400 `pick-again` and the page asks the student to pick their name again.
- **Rules:** one claimer per street (`place_id` is unique); a student may claim any number of streets; no dates, so a claim lasts the whole drive; no editing. The claimer deletes it by picking their own name in the delete confirm, and organizers can delete a row in the SQL editor. Deleting removes the row and the street is open again. The Essex County street check above still applies.
- **Table:** `public.street_claims` (`id`, `student_id` → `students`, `place_id` unique, `address` like "Ouellette Avenue, Windsor", `lat`/`lng` for the marker, `created_at`). RLS on, no policies: server-only, like the other tables. `lat`/`lng` exist only so markers can be drawn without calling Google per claim.
- **Routes** (`app/api/claims/`, no login, admin client, so each handler is the rule):
  - `GET /api/claims` → `[{ placeId, address, lat, lng, claimer }]`, built by the pure `buildClaims()`. `no-store`; the page stays ISR and the browser fetches claims itself, so they're never a minute stale.
  - `GET /api/claims/students?q=` → name-picker suggestions, as above. Reads the roster (~1,100 rows) per search; the picker debounces by 200 ms.
  - `POST /api/claims { student, placeId, address, lat, lng }` → 200 `{ claim }`; 409 `{ claim }` when someone else holds the street; 400 for bad input (lengths, and coordinates must be inside the Essex County search rectangle) or a bad ref; 404 if the student has left the roster; 502 on a database failure. The unique constraint settles races: the loser reads the existing row, and if it's the **same student** (a double click or retry) the answer is still 200, so a retry never creates a second row.
  - `DELETE /api/claims { placeId, student }` → one statement, `delete … where place_id = $1 and student_id = $2`. 200 if a row was deleted or no claim exists (so retries are safe); 403 "That name doesn't match this claim." if the claim exists but isn't theirs.
- **What is public:** the claimer as **"First L. (homeroom)"**, like top donors, plus the street and its marker position. The name search reveals the same "First L. (homeroom)" for whoever matches the typed letters. No student IDs, surnames, grades or teachers. Checked: the claims and search responses and the page source contain none.
- **Map UI:** each claim is an `AdvancedMarkerElement` pin (`gmpClickable`, titled with the street). Clicking it, or Tab to it and Enter, selects the claim in the React result panel (never an InfoWindow of HTML strings) and moves focus there. A "Claimed streets" list sits under the map (`components/home/claimed-list.tsx`), A to Z and two across from `sm` up. A list of more than 8 starts as its first 6 streets with a **See all N streets** row closing the box; **See fewer streets** folds it back. Expanding moves focus to the first street revealed, and collapsing scrolls by the height removed so the button stays where it was. All claims are still fetched at once; the preview only limits what is drawn. Once picked, the name shows as a tag with "Not you?"; the pick is kept across streets, so claiming several takes one click each.
- **Street status, one colour language:** the panel opens with a small solid tag, and the map pin uses the same colour. **Taken** (tomato tag, tomato panel border, tomato pin): someone else has the street; the panel says who and "Search for another one." instead of showing the form. **Open** (ink tag; the picked street's pin is butter): the claim form shows. **Yours** (butter tag and pin): just claimed by this visitor. Other people's claims are ink pins. The word always accompanies the colour, so the state never depends on colour alone. "Delete my claim" is a quiet link under a taken or claimed street, which opens an inline confirm with the name picker.

**Known limits** (accepted, not built around):

- Anyone can pick any student's name, so anyone can claim **or delete** in a classmate's name. That is the trust model; organizers correct misuse in SQL.
- The name search is public, so the roster can be listed as "First L. (homeroom)" by trying letter pairs. Surnames, ids and grades never leave the server.
- The server trusts the `placeId`, `address` and coordinates the browser sends; the Essex County street check runs only in the browser (the server only checks the coordinates fall in the county's rectangle). Re-checking with Places on the server would need a server-side key. Follow-up.
- No rate limiting, CAPTCHA or other spam protection.
- A deleted claim leaves no history.

### The API key is public, so it's restricted

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is inlined into the browser bundle at build time, and it appears in every Maps request, which is how the Maps JavaScript API works. It is protected by restrictions in Google Cloud, not by secrecy (see `notes/13-public-browser-keys.md`). Apply these under **APIs & Services → Credentials → the key**:

- **Application restriction: Websites.** Allow `http://localhost:3000/*`, `https://<production-domain>/*`, and `https://*-<vercel-team>.vercel.app/*` only if previews need the map.
- **API restrictions: Restrict key** to **Maps JavaScript API** and **Places API (New)**, and enable both in the project.
- **Quotas (optional):** a daily request cap on Places API (New) as a cost backstop.

Set both variables in Vercel (Production and Preview). They are read at **build** time, so redeploy after changing them.

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

The homepage reads **live data** from Supabase. Every live figure comes from **`getHomepageData()`** in `lib/homepage.server.ts`. `app/page.tsx` calls it once and passes plain props down; no section imports data itself. That includes [Grade Wars](#grade-wars): its per-grade daily totals are a regrouping of the same rows.

```
students + donation_logs  --admin client (server only)-->  getHomepageData()
   (private rows)                                             |  buildHomepageData(): sums, groups, top 8 today
                                                              |  buildGradeWars(): per grade, last 5 weekdays
                                                              v
                       { goal, total, homerooms[], topDonors[], gradeWars }  -->  page (static, rebuilt at most once a minute)
```

- **How:** `loadRoster()` (paged, reused from the volunteer desk) plus a keyset-paged read of `donation_logs` (`cans` and `cash` only; `online` stays out until refunds are defined). The aggregation is a pure function, `buildHomepageData()` in `lib/homepage.ts`, unit-tested on synthetic students in `lib/homepage.test.ts`.
- **Why in TypeScript, not SQL:** it needs no migration and reuses the one rounding rule (`canEquivalents()`) instead of copying it into SQL. Reading about 1,100 students plus a few thousand logs at most once a minute is cheap. If volume ever grows, the upgrade is one SQL function that returns the same JSON, called from the same place.
- **Rounding rule:** each student's total is `canEquivalents(cans, cents)` (partial dollars round down, per student). A homeroom's total is the sum of its students' totals, and the school total is the sum of the homerooms. Every level matches the volunteer dashboard.
- **Homerooms** are the roster's `hr` values, all 58 of them, including tiny or non-class codes like `Office` or 1-student rooms (the owner's decision; a 1-student room's total reveals that student's amount). Many mix grades, so each has `grades: number[]` ("Grades 10, 11, 12"), and "grade 9" in the search matches any homeroom with a grade 9 student. They're sorted by total, then by room code.
- **Staff** (owner's decision, 2026-10-04) are rows in `students` in one homeroom, `Teachers`, with `grade` NULL; a check constraint ties the two together (`(grade is null) = (hr = 'Teachers')`). No separate table or flag: logging, totals, top donors, `/students` and street claims treat them like anyone else, and `Teachers` is a normal homeroom in the standings and the school total, labelled "Staff" where a grade would be. Having no grade keeps them out of Grade Wars. On `/students` a staff member's details show totals and history but no reward sections, since no reward is confirmed for staff. The rows were inserted by hand, like the roster, so real names stay out of this public repository. Applied to the live project on 2026-10-04 (migration `staff_homeroom`, 91 staff): the constraint rejected a student without a grade and a staff row with one, and staff appeared in the `/students` search, the homepage homerooms and the claim picker.
- **Teachers first** (owner's decision, 2026-09-30): standings rows and the podium name a homeroom by its teacher's surname (`hr_teacher`, read only by `getHomepageData()`; the volunteer roster still never selects it). The selected homeroom card leads with the teacher (88px, shrunk to fit a long name on one line), then "Homeroom 121"; the phone accordion shows "HOMEROOM 121"; clicking a donor's teacher swaps in "Rm 204". A room with several teachers shows them all ("Adams / Baker"); one with none falls back to its code. Some teachers have more than one homeroom, so two rows can share a name until clicked. Search matches teacher or room.
- **Top donors:** students with the highest can-equivalents **today** (America/Toronto day of `occurred_at`), top 8, shown as **first name + last initial** (owner's decision). Ties are ordered by name for display only; the lunch-voucher tie rule is unconfirmed.
- **What is public:** the result is serialised into the page, because `Standings` is a client component. It contains only aggregates, each homeroom's teacher surname, today's top donors ("First L.", homeroom, teacher, total) and Grade Wars' per-grade totals for the last five collection days (cans, cash cents, can-equivalents): no student IDs, full student surnames or individual logs. Checked: the rendered page contains no `student_id` or `hr_teacher` key, and no student surname other than ordinary words already in the page copy.
- **Freshness:** `export const revalidate = 60` (ISR). The page is served from cache and rebuilt in the background at most once a minute, so a saved donation shows up within about a minute. If a rebuild fails (for example, Supabase is down), the last good page keeps being served. `next build` also queries Supabase, so the env vars must be set wherever the site is built.
- **Why the admin client is acceptable here:** it bypasses RLS and this page has no login. That's safe only because the function returns public aggregates. Adding a field to its result is a publishing decision.

Fixed copy that isn't data lives in `DRIVE` in `lib/site.ts`: the goal (20,000 can-equivalents), drive dates (display text plus `startDate`/`endDate`), Grade Wars' `dailyCutoff`, desk location and hours, and organizer contact.

Display helpers used by the client standings are in `lib/homepage.ts`: `homeroomStats` (dodgeball target, percentage, real cans/cash split, status), `matchesQuery` and `gradeLabel`. Move the reward maths into the single incentive-calculation module that `CLAUDE.md` requires once the rules are confirmed.

**Rewards are confirmed** (owner, 2026-09-29), as shown on the page: $1 = 1 can; dress-down day at 10 cans or $10; lunch vouchers for the top 3 donors each day; a pizza party for the #1 homeroom; dodgeball for the first 20 homerooms to reach 10 cans per student. Public figures are labelled "cans" everywhere (hero and podium) even though they are can-equivalents, by the owner's choice, because it reads more cleanly; the hero copy explains $1 = 1 can. The site shows progress toward these rewards but doesn't decide winners: ties, cutoff times and the order in which homerooms qualify for dodgeball are for the organizers.

### Hero meter

Both meters derive the fill, the count and the notes from `(goal, total)` in one place (`progress()` in `hero.tsx`). The percentage is floored, so it never shows 100% while cans are still to go. The fill caps at the rim, and past the goal the notes read “Goal reached! +N over”. On desktop the can's inner box and the tick column are both 300px, so the fill maps 1:1 to the scale, and a pointer sits exactly on the fill line. Each meter is `role="img"` with a full `aria-label`.

## Student Standings (`/students`)

A public page with two rankings that must never be confused, plus a roster search and a per-student view.

- **Owner's decision (2026-10-02): this page publishes individuals.** With no sign-in, anyone can search the roster and see a student's full name, grade, homeroom, teacher label, all-time and today's totals, ranks, reward progress and donation history (date and time, method, amount). The homepage is unchanged ("First L."). Never sent: `student_id`, `transaction_id`, `recorded_at`, raw `hr_teacher` beyond the label, and anything about volunteers or admins. `lib/standings/types.ts` is the whole public surface.
- **Always live (owner's decision, 2026-10-02).** The page and `/api/standings/*` always read the real `students` and `donation_logs` tables. There is no flag, demo mode or off switch: taking the page down means reverting or removing it in a deploy.
- **Seam:** `StandingsRepository` (`searchStudents`, `getStudentProfile`), implemented by `HttpStandingsRepository` (the route handlers). Components never import a data source. Tests inject an in-memory repository over fictional students from `lib/standings/test-fixtures.ts`, which no app code imports.
- **What arrives with the page:** `getStandingsData()` (`lib/standings/standings.server.ts`, server-only, called once in `app/students/page.tsx`, ISR 60s) returns today's top 7 (three for the shelf, four "close behind"), the all-time rows and counts. Search and profiles are separate requests, so the roster and histories are never in the page payload.
- **Calculation** is the pure, tested `lib/standings/build.ts`. `buildIndex()` sums every counted log once (`cans` and `cash`; `online` stays out), skipping logs for students who aren't on the roster and students outside Grades 9–12. Staff (no grade) are ranked with the students.
  - **Today** is the Toronto calendar day of `occurred_at` (`torontoDayKey`), ranked over the whole roster, zero totals excluded. The all-time ranking never affects who is on the shelf.
  - **All-time** is every counted log: no date filter, no drive filter, no reset.
  - **Rounding:** `canEquivalents()` per student per grouping (all-time, today, a dress-down window, the drive), then sums.
  - **Ties:** competition ranking (1, 2, 2, 4). Inside a tie the order is last name, first name, homeroom, for display only; the page marks ties and settles nothing.
  - **Top 25:** ranks ≤ 25, so a tie at 25th shows everyone tied there and the footer says so. Fewer than 25 donors shows only real donors; the table is never padded.
- **Student refs** (`lib/standings/ref.ts`): the id sealed with AES-256-GCM under a `standings:` key derived from `SESSION_SECRET`, so a claim-picker ref isn't a standings ref. Unlike claim refs they are deterministic (the nonce is derived from the id): `?student=<ref>` links stay valid and the page can tell that the open student is a row in the table. Nothing is lost by that here, because the full name is shown beside every ref. Rotating `SESSION_SECRET` invalidates shared links (they show "We couldn't find that student").
- **Routes** (`app/api/standings/`, no login, admin client, so each handler is the rule): `GET students?q=` returns `{ items (≤ 8), total }`, `q` capped at 100 characters, nothing under 2 letters; `GET students/<ref>` returns one `StudentProfile`. Both send `Cache-Control: no-store`, 502 with `{ error }` on a database failure and 404 for an unknown, altered or foreign ref. **No rate limit**, matching `/api/claims/students`; because every result needs its all-time rank, each request needs all logs, so the loaded rows are reused in memory for 15 seconds (`REUSE_MS`). That bounds database reads, not requests.
- **Search** reuses `searchStudents()` and `findSameNames()` from the volunteer desk. Order: names that start with the query, other word-prefix matches, then near spellings under "Similar spelling". Students who share a full name carry a `SAME NAME` mark, and the student view says which one this is.
- **Failure is never zero.** If `getStandingsData()` throws during a background rebuild, ISR keeps the last good page. With no page to fall back on, `app/students/error.tsx` renders the same page with `data = null`: the shelf says "Today's donations didn't load" and the table shows an error panel, each with Try again; search still works because it is a separate request. A failed shelf draws blank outlines, not "Open spot". The hooks (`use-student-search.ts`, `use-student-profile.ts`) stamp each result with the query or ref and attempt it answers, so stale replies are dropped; search is debounced 150ms.
- **Student view:** a dialog (drawer on desktop, full screen on phones) with focus trapped, Escape and scrim to close, and focus returned to what opened it. The open student is `?student=<ref>` via `history.pushState`, so refresh and share work and Back closes it. It is read-only: no edit controls or internal fields.
- **Rewards are progress, not decisions** (`lib/standings/rules.ts`). Confirmed: $1 = 1 can, dress-down at 10, dodgeball at class size × 10 for the first 20 homerooms. Placeholders, each `confirmed: false`:
  - *Dress-down windows:* one per Friday in the drive (Oct 9, 16, 23), each running from the day after the previous window through Thursday; the first starts on `DRIVE.startDate`.
  - *Cutoff:* Thursday 23:59 Toronto. *Carryover:* none.
  - While any of these is unconfirmed the ticket carries a `PROVISIONAL RULES` stamp and says "Reached 10 by the cutoff" or "Below 10 by the cutoff", never "Eligible". Progress counts only that window's donations and is never capped ("Target reached: 14 counted this week").
  - *Early donations (owner, 2026-10-03, so the page can be tried before the drive opens):* a donation dated before `DRIVE.startDate`, in the same calendar year, counts toward the first dress-down window and the homeroom's dodgeball total (`earlyFrom()`, `countsTowardDrive()`). Earlier years never count. A test entry logged before the drive therefore keeps counting until it is deleted.
  - *Dodgeball:* the class total is the sum of its students' can-equivalents **dated up to the drive's last day** (early donations included, earlier years and later dates not); "Target reached" is not a place. "Qualified" appears only for a homeroom with a row in `dodgeball_places`, an **unapplied draft** (`supabase/drafts/dodgeball_places.sql`). The server reads that table if it exists and otherwise treats every place as unconfirmed. A place is never derived from totals.
- **Known difference:** the homepage standings sum **all** logs per homeroom, while this page's dodgeball total leaves out earlier years and anything after October 23. They agree unless such logs exist. Which one is right for dodgeball is an open question for the owner.
- **Navigation:** `NAV_LINKS` now mixes section links (`#standings`) and page links (`/students`). `navHref()` in `lib/site.ts` prefixes only section links, because `"/" + "/students"` is `//students`, which browsers read as another host.
- **Verified:** unit and component tests (`lib/standings/*.test.ts`, `app/api/standings/students/route.test.ts`, `components/standings/standings-page.test.tsx`); the page in a browser against the real project (roster count matches the `students` table, search, profile, "We couldn't find that student" and 404 for altered refs, empty states, responses and page source free of `student_id`, `transaction_id`, `recorded_at` and `hr_teacher`). Rankings were then checked end to end on 2026-10-02 with temporary synthetic rows in the real project (five fictional students, ids 990001–990005, in made-up homerooms; inserted, checked in the browser at 1440 and 390, then deleted): today's podium with a tie for 2nd, the all-time table, two students with one name, $5.50 rounding to 5 and $0.50 to 0, an `online` log excluded, a 2025 log counted all-time but not today, and the Toronto midnight boundary (03:59:59Z counts as the previous day, 04:00:00Z as today). The homepage read the same rows (92 cans school-wide, top donors as "First L.") but differs in two ways: its homeroom dodgeball figure counts all logs (the known difference above), and its podium lists two students tied on 17 as 2nd and 3rd place, while this page marks them both tied 2nd.

## Grade Wars

A daily ranking of Grades 9–12, one collection day at a time, between The Standings and Top Donors. It shows live data computed by `getHomepageData()`.

- **Where the numbers come from:** `buildGradeWars(students, logs, now)` (`lib/grade-wars/build.ts`, pure and unit-tested) regroups the roster and counted logs that `getHomepageData()` already loads, so it adds no query, route or browser fetch. `app/page.tsx` passes the result as `<GradeWars data={gradeWars} />`, and `PrecomputedGradeWarsRepository` serves it from memory through the same `GradeWarsRepository` → `useGradeWars()` seam the UI was built against. At most 5 days × 4 grades reach the page.
- **Which days (owner's rules, 2026-09-30):** every weekday from `DRIVE.startDate` (Oct 5) through today, capped at `DRIVE.endDate` (Oct 23), including weekdays with no logs (Thanksgiving Monday shows as a day with no donations). Weekends never appear and weekend logs are ignored, because logging isn't possible then. Only the last 5 are listed, ascending; on a Saturday or Sunday the last is Friday. Logs outside the drive dates (such as September test entries) are ignored.
- **Final vs. in progress:** today is in progress until `DRIVE.dailyCutoff` (8:10 a.m., when the desk closes) in Toronto wall-clock time, read with `torontoClock()` (never a fixed UTC offset), then final. Earlier days are always final. "Final" is a label, not a snapshot: logs still count by the Toronto day of `occurred_at`, including entries timed after 8:10 and later corrections.
- **Totals:** grade is the student's roster grade, looked up by `student_id`; logs for students missing from the roster or outside Grades 9–12, and for staff (no grade), are skipped. Rounding follows the homepage: each student's day is `canEquivalents(cans, cents)`, then grades sum. Each grade also keeps its raw `cans` and `cashCents` for the "318 cans + $102 cash" line. Every day has exactly four totals, zero-filled.
- **Ranking** is the pure, tested `rankDay()`. It ranks by each grade's `total` (the per-student sum) and never re-rounds the grade's summed cash, which can come out higher (two students' $0.50 would give 1 instead of 0 + 0). That way the ranking and the shown numbers always agree. It uses competition ranking (305, 305, 270, 240 → 1, 1, 3, 4) with no tiebreaker; equal totals list by grade for display only.
- **Before the drive** there are no days, and the section shows a stable "Grade Wars starts Monday, October 5" card instead of loading forever.
- **Privacy:** nothing is suppressed, even when one student is a grade's only donor on a day, which reveals that student's amount. The owner judged this rare, and Top Donors already publishes more ("First L.", homeroom and today's total).
- **Hydration tradeoff (accepted):** the section is a client component and its repository resolves asynchronously, so the server HTML shows the loading placeholder and the figures appear as soon as the page's JavaScript runs. The layout doesn't shift between the two. Freshness is the homepage's: rebuilt at most once a minute, so "today" and the in-progress label can lag by about that much.
- **Stale responses** are dropped: a result is shown only if it answers the currently selected day and retry attempt.
- **Podium height is place, not amount** (4 rows of cans for 1st down to 1 for 4th); the breakdown list is the accessible ranking and the podium is `aria-hidden`. Columns are keyed by grade so they slide on date change; `motion-reduce` makes that instant.
- **No reward is shown.** The daily recognition for the top grade is unconfirmed; the section says so and nothing more.
- **Collection days are calendar dates, not instants.** `"2026-10-23"` is formatted by pinning it to noon UTC and formatting in UTC (`lib/grade-wars/format.ts`), so it reads as Oct 23 in every time zone. `new Date("2026-10-23")` would be UTC midnight, which is still Oct 22 in Toronto.
- **Layout:** below `lg` the podium is a descending staircase (1st to 4th, left to right, 2 cans per row); from `lg` it is the classic podium (2nd, 1st, 3rd, then 4th set apart, 3 cans per row), and from `xl` the ranking list sits beside it. The prompt said to switch at about 768px, but the podium's 800px design width doesn't fit a tablet, so it follows the homepage's `lg`/`xl` convention. Desktop column offsets are percentages of that 800px width, so the podium also fits the 1280px column. One component tree serves both layouts.
- **States** (all layout-stable): final, in progress ("Leading today", never "winner"), tie ("Tied 1st" tags, shared height and colour), empty (no ranking, no winner), not started, loading and unavailable (with Try again).
- **Files:** `lib/grade-wars/` holds `types.ts`, `repository.ts`, `build.ts` and `rank.ts` (+ tests), `precomputed.ts`, `format.ts`, `view.ts` (which tag, note and announcement each state gets), `use-grade-wars.ts`, and `mock.ts` (fictional figures, a test fixture only). `components/home/grade-wars/` holds the section, date panel, podium, breakdown, tag and component tests.

## Accessibility

- Skip link to `#main`, landmark `header` / `main` / `footer`, and labelled `nav`s.
- Every section has a heading, and there is one `h1`.
- A visible focus ring on every focusable element (butter outline with an ink halo), as specified in the design.
- Standings rows are buttons with `aria-pressed` and a full `aria-label` (room, grade, rank, total). The result count, empty state and desktop detail card are `aria-live="polite"`.
- The street search is Google's combobox, named “Search for a street” with `aria-label` (its input is in a closed shadow root, so a `<label>` can't reach it). It works with Tab, typing, arrow keys and Enter. The chosen street, or the reason it was rejected, is announced from an `aria-live` panel.
- The mobile menu button has `aria-expanded` and `aria-controls`, and Escape closes the menu.
- Smooth anchor scrolling only applies under `prefers-reduced-motion: no-preference`.
- Grade Wars: the day chips are a `role="group"` with a roving tabindex (only the selected chip is in the Tab order), ArrowLeft/ArrowRight/Home/End move the selection and focus with it, and each chip's `aria-label` is the full date ("(latest)" on the last). ←/→ and "Back to latest" use `aria-disabled` at the ends, so focus isn't dropped. The podium is `aria-hidden`; the ranking `<ol>` is the accessible version, and every tie has a text tag. A polite live region announces the new ranking, but only after the visitor acts. Column slides and height changes are off under `prefers-reduced-motion: reduce`.

## `/docs` route

`app/docs/page.tsx` reads `docs/architecture.md` from disk at build time and renders it with `react-markdown` and GitHub-flavoured markdown. The route is static and marked `noindex`. The markdown file stays the single source, readable on GitHub as well.

`@next/mdx` was not used. It needs `next.config` and `mdx-components.tsx` changes, and the Next 16 docs describe `.md` handling for webpack, whereas Turbopack is the default.

## Deliberately not built yet

- Street segments or areas: a claim is a whole street (one Google place), drawn as one marker. Auth is a single admin login table (see Volunteer login).
- The design-tool runtime (`support.js`).
- Dark mode (see Visual system).

## Open items

| Item | Needed from | Notes |
| --- | --- | --- |
| Branding | Owner | Decided: keep the tomato/butter palette. The Assumption College crest is in the header and footer. |
| Desk days | Owner | The desk runs Oct 5–23, 7:30–8:10 a.m. It isn't confirmed whether that's every school day. |
| Volunteer admins | Owner | Add the real admin logins in the SQL editor (see `CLAUDE.md`), and set `SESSION_SECRET` in Vercel before deploying. |
| Log search/indexes and `updated_at` | Build | Logs are in `donation_logs`. `supabase/drafts/volunteer_workspace.sql` (indexes, `updated_at`, Postgres name search) is optional until volume or audit needs call for it. |
| Street claims | Owner + build | Built as the simplest version (see [Street claims](#street-claims)). Open: whether impersonation, spam or the browser-trusted street check ever need more than organizers fixing rows in SQL. |
| Google Cloud key settings | Owner | Apply the referrer and API restrictions in [Collection map](#collection-map), and set both `NEXT_PUBLIC_GOOGLE_*` variables in Vercel. |
| Incentive details | Organizers | The rewards are confirmed. Still open, if the site should ever decide winners: daily cutoff times, ties, and how the dodgeball qualification order is recorded. |
| Grade Wars recognition | Owner | Settled (2026-09-30): weekdays only, last 5 days, final at 8:10 a.m., per-student rounding, no suppression (see [Grade Wars](#grade-wars)). Any daily recognition for the top grade (e.g. a song announcement) is unconfirmed and not shown. |
| Baseline migration history | Owner | `supabase/migrations/20260927000000_baseline_schema.sql` is already applied on the remote project but isn't recorded there. Run `pnpm exec supabase login`, then `link --project-ref gcrfsdmkcfywkofhijsi`, then `migration repair --status applied 20260927000000`. The two admin migrations are recorded remotely as `20260929171156` and `20260929200832`, not their local file versions, so repair those too (or rename the files); `20260930140622_street_claims.sql` already matches. |
