# Calendar dates vs. instants

## Two different things that both look like "a date"

- An **instant** is a single point on the world's timeline: "the moment this donation was saved". Every person on Earth agrees on it, even though their clocks show different local times. Store it as `timestamptz` in Postgres, or an ISO string with an offset (`2026-10-23T12:15:00Z`). `occurred_at` and `recorded_at` are instants.
- A **calendar date** is a label on a local calendar: "Friday, October 23 at this school". It has no time and no zone of its own. It means "that day, wherever we are". A collection day is a calendar date: `2026-10-23`.

Mixing the two up causes **off-by-one-day** bugs that only appear for some users, or only at certain hours.

## The trap: parsing a date as if it were an instant

In JavaScript, `new Date("2026-10-23")` doesn't mean "October 23". The spec reads a date-only string as **midnight UTC**, which is an instant. Format that instant for someone in Toronto (UTC−4 in October) and you get **8 p.m. on October 22**. The label on the page silently shifts back a day.

Other languages have their own versions of the same trap. The fix is always the same: keep calendar dates as calendar dates, and don't convert them to instants just to format them.

What the app does (`lib/grade-wars/format.ts`): split `"2026-10-23"` into year, month and day, build noon UTC on that day, and format it **in UTC**. Noon keeps you well away from midnight, and formatting in the same zone you built it in means no zone conversion happens at all. The output is "Friday, October 23" in every time zone.

## Going from instants to calendar dates

Grouping donations "by day" turns instants into calendar dates, and you must say **whose** day you mean. A donation at 9 p.m. on Oct 22 in Toronto is already Oct 23 in UTC. The project rule is to use `America/Toronto` for local days, always named by that zone, never as a fixed "−4". The offset changes with daylight saving (−4 in summer, −5 in winter), and a hard-coded number is wrong for half the year.

In SQL that looks like `(occurred_at at time zone 'America/Toronto')::date`. In JavaScript, it's a formatter with `timeZone: "America/Toronto"` (see `torontoDayKey()` in `lib/volunteer/time.ts`).

## Rules of thumb

1. Store moments as instants (`timestamptz`) and days as dates (`date`). Don't store a day as midnight of some zone.
2. Convert an instant to a day only at the point where you group or display it, and name the zone explicitly.
3. Never parse a date-only string into a date-time object and then format it in another zone.
4. Test around midnight and daylight-saving changes, not just at noon.
