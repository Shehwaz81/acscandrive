# Architecture and design decisions

This is the running record of how the Can Drive site is built and why. Update it when a decision changes. Business rules and data constraints live in `CLAUDE.md`. This file covers the technical and design choices made to satisfy them.

_Last updated: 2026-09-27. Current scope: public homepage frontend with demo data. There is no database, auth, or API yet._

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack) | Server components by default. Client components only where state is needed. |
| UI | React 19.2, TypeScript (strict) | |
| Styling | Tailwind CSS v4 | Tokens live in `app/globals.css` via `@theme`. There is no `tailwind.config`. |
| Fonts | `next/font/google` | Self-hosted at build time, so there are no runtime requests to Google. |
| Docs rendering | `react-markdown` + `remark-gfm` | Renders this file at `/docs`. |
| Hosting (planned) | Vercel | |
| Data (planned) | Supabase/Postgres | Not wired up yet. See [Open items](#open-items). |

## Source of the design

The homepage is a port of the claude.ai/design file **Can Drive Homepage.dc.html** (“The Can” concept). It has two artboards, desktop 1440 and mobile 390. The design file uses its own template runtime (`support.js`, with `<sc-for>`, `{{ }}` bindings and `style-hover`). None of that runtime was ported. Its markup and its small `DCLogic` state class were rewritten as React components.

## Page structure

```
app/
  layout.tsx          fonts, metadata, <html lang="en-CA">
  page.tsx            homepage: skip link + header + sections + footer (static)
  globals.css         design tokens, base styles, effect utilities
  docs/page.tsx       renders docs/architecture.md
components/
  can.tsx             the CSS can (progress meter + podium block)
  ticket.tsx          torn-stub reward ticket
  marks.tsx           marker underline, rubber stamp, logo placeholder
  home/               one file per homepage section
lib/
  demo-data.ts        every number on the homepage + pure helpers
  site.ts             nav links, content-width class
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

The homepage prerenders as a static route (`○` in `next build`).

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

**Motif.** The can is the progress meter: large in the hero and small on the homeroom card. Rewards are torn-stub tickets, notes are marker scribbles, and anything unconfirmed gets a rubber stamp (“DEMO”, “Preview rules”).

**Effects** that would be unreadable as Tailwind arbitrary values are named utilities in `globals.css`: `ticket-mask`, `can-ribs`, `can-lid`, `hatch`, `progress-stripes` and `stub-label`. They are declared with `@utility`, so responsive variants like `lg:can-lid` work.

## Data boundary

Every figure on the homepage comes from **`lib/demo-data.ts`**. It holds the goal, school total, 16 homerooms, the fictional top donors and the zone grid, plus pure helpers:

- `homeroomStats` computes the dodgeball target, percentage, split and status.
- `matchesQuery` implements the standings search rule: `grade 9` or `g9` matches a grade, a bare number matches a grade, and anything else matches part of the homeroom code.

When the database exists, the plan is:

1. Replace the constants with **aggregate-only** server queries: school total, homeroom totals and daily top donors. These should come from a view or RPC that exposes only the fields the page shows.
2. Keep the page a server component that fetches those aggregates and passes plain props to the client components. **No private student rows should reach the browser.**
3. Move the reward maths (targets, can-equivalents, top-3 ties) into the single incentive-calculation module that `CLAUDE.md` requires. Do that only once the rules are confirmed.

The cash split (`~27%`) and the “$1 = 1 can” wording are demo placeholders. Nothing on the page is a confirmed rule, which is why the page is stamped “Preview rules — awaiting confirmation”.

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

- Backend, auth, volunteer entry and reservations. The homepage is frontend-only.
- The design-tool runtime (`support.js`).
- Dark mode (see Visual system).

## Open items

| Item | Needed from | Notes |
| --- | --- | --- |
| School logo and branding | Owner | Dashed “SCHOOL LOGO” placeholders in the header and footer. |
| Volunteer login route | Build | The link is `#`. It depends on the account-strategy decision in `CLAUDE.md`. |
| “Choose a collection area” flow | Owner + build | The link is `#`. The area model and booking rule are undecided, and the grid is a schematic placeholder. |
| Incentive rules | Organizers | Dates, cutoffs, ties, dodgeball qualification order, and cash treatment. |
| Public donor names | Owner | The page shows “First L.” names (fictional). How real names appear publicly is a privacy decision. |
| Desk location, hours, organizer contact | Organizers | Shown as “TBC” boxes. |
| `utils/supabase/server.ts` | Build | It is currently a copy of the browser client and imports `@supabase/ssr`, which isn't installed (`@supabase/server` is). Fix it when the data layer is built. |
