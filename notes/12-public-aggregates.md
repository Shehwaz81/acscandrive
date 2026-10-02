# Public pages: send totals, not rows

How the public homepage should get its numbers, and the general ideas behind it. Note 09 covers private data on a protected page. This note covers the page that anyone can open.

## Anything the page receives is public

A server can render a page from any data it has access to. What matters is what it **sends**. Two things leave the server:

- the HTML, and
- the data an interactive component needs to run in the browser. Frameworks serialise this data into the page, and anyone can read it with "View source".

So passing a list of donation rows to an interactive standings table, and only *displaying* the totals, publishes every row. Hiding data in the UI is not access control (note 01).

## Aggregate at the boundary

The homepage needs a school total, a total per homeroom, and today's top donors. So the server computes those and sends only those:

```
database rows (private)  ──sum / group by──▶  a few numbers (public)  ──▶  browser
```

In this app, one server-only function (`getHomepageData()`) is that boundary. It reads the roster and every donation with the secret key, adds them up, and returns only the totals. Because every section gets its figures from that one function, there is one place to check what leaves. Adding a field to its result is a publishing decision, not a refactor.

Where to add things up is a real choice. The database could do it (a SQL `GROUP BY` in a view or function), or the server can fetch rows and sum them in code. Here the server sums them, because the data is small (about 1,100 students and a few thousand donations), there is no schema change, and the rounding rule stays in one place in code. Summing in the database wins once the rows get too many to move around. The boundary is the same either way: private rows stay on the server side.

## Aggregates can still leak

A total is not automatically anonymous:

- **Small groups.** If a homeroom has one donation so far, its "total" is that student's donation.
- **Differences over time.** A total that jumps by 40 right after someone was seen at the desk tells you what they gave.
- **Named lists are a disclosure by design.** "Top donors" publishes names and amounts on purpose, so it needs the organizer's decision on how names appear (for example, first name + initial) and whether students can opt out.

## When the decision is to publish individuals

Sometimes the point of a page *is* the individual: a leaderboard with names, or "look up my total". That isn't a leak, as long as someone with the authority to decide has decided it, and the page then publishes exactly what was approved and nothing else. The boundary idea doesn't change, only what crosses it:

- **Write down the public shape.** List the fields that may leave (name, grade, total, each donation's date, method and amount) as a type, and build every response from that type. Anything not in it stays behind: internal ids, who recorded an entry, bookkeeping timestamps.
- **Never hand out the database's own id.** A public page still needs a way to say "this student". Give the browser an opaque token instead: the id encrypted and signed by the server. The browser can hand it back, but can't read it, guess the next one or make one up. Here the token is the same every time for one student, so a shared link keeps working. That is fine because the name is shown right beside it anyway; where the name is hidden (the claim picker), tokens are random each time so they can't be compared.
- **Fetch on demand, not in bulk.** The page itself carries only the top of the rankings. A search returns a handful of matches, and a profile returns one student. The full roster and every history never travel in one response. This doesn't make them secret (anyone patient can search name by name), but it keeps each response small and makes bulk copying a deliberate act.
- **A public lookup can be enumerated.** Requiring two letters and capping results slows a casual copy; it doesn't stop a script. If that matters, the fixes are a rate limit or a login, and choosing neither is a decision to record, not an oversight.
- **One exception, clearly fenced.** Publishing names on one page doesn't change the others. Each page keeps its own boundary function, so widening one doesn't quietly widen the rest.

In this app the owner approved exactly this for the Student Standings page: full names, totals, reward progress and donation history are public there, while the homepage still shows "First L.".

For a school can drive, these risks are small and accepted. But they are real choices, not side effects. In this app, the owner chose to show every homeroom, including 1-student ones, and to show top donors as first name + last initial. Grade Wars' daily per-grade totals aren't suppressed either, even on a day when one student is a grade's only donor: rare, and less than the top donors list already shows.

## One source for every figure

The hero's fill level, its number, "62% there" and "7,520 to go" are all computed from the same two values, goal and total. If each piece computed its own figures, they could disagree (for example, rounding up to "100%" while 10 cans are still missing). This is the same idea as note 11's derived totals: store or fetch the base facts once, and derive everything else from them.

## Rounding once, at a defined level

Converting money to "cans" loses the partial dollars, so *where* you round changes the answer. Two students giving $1.50 each is 1 + 1 = 2 if you round per student, but 3 if you add the $3.00 first. This app rounds **per student**, then adds whole numbers upward (homeroom, then school). That way every level agrees with the student totals volunteers see. The alternative gives slightly bigger totals that no longer add up.

The trap comes back whenever the same rows are **regrouped**. Grade Wars groups by grade and day instead of by homeroom, and each grade also shows its raw cans and cash. It's tempting to rank grades by converting that summed cash again, but that is rounding at the grade level: two students' $0.50 would become 1 instead of 0 + 0. The rule has to be applied at the same level (the student, on that day) in every grouping, and anything that sorts or compares must use the same rounded numbers that are displayed.

## Static pages and fresh numbers

A page built once at deploy time (a "static" page) is fast and cheap, but its numbers freeze at build time. This homepage uses **incremental regeneration**: visitors get the cached page, and at most once a minute a visit triggers a background rebuild with fresh totals. A donation shows up within about a minute. If the database is down during a rebuild, the old page keeps being served instead of an error. That's the stale-while-revalidate pattern, the same idea as HTTP's `Cache-Control: stale-while-revalidate`.
