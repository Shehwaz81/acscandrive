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

For a school can drive, these risks are small and accepted. But they are real choices, not side effects. In this app, the owner chose to show every homeroom, including 1-student ones, and to show top donors as first name + last initial. Grade Wars' daily per-grade totals aren't suppressed either, even on a day when one student is a grade's only donor: rare, and less than the top donors list already shows.

## One source for every figure

The hero's fill level, its number, "62% there" and "7,520 to go" are all computed from the same two values, goal and total. If each piece computed its own figures, they could disagree (for example, rounding up to "100%" while 10 cans are still missing). This is the same idea as note 11's derived totals: store or fetch the base facts once, and derive everything else from them.

## Rounding once, at a defined level

Converting money to "cans" loses the partial dollars, so *where* you round changes the answer. Two students giving $1.50 each is 1 + 1 = 2 if you round per student, but 3 if you add the $3.00 first. This app rounds **per student**, then adds whole numbers upward (homeroom, then school). That way every level agrees with the student totals volunteers see. The alternative gives slightly bigger totals that no longer add up.

The trap comes back whenever the same rows are **regrouped**. Grade Wars groups by grade and day instead of by homeroom, and each grade also shows its raw cans and cash. It's tempting to rank grades by converting that summed cash again, but that is rounding at the grade level: two students' $0.50 would become 1 instead of 0 + 0. The rule has to be applied at the same level (the student, on that day) in every grouping, and anything that sorts or compares must use the same rounded numbers that are displayed.

## Static pages and fresh numbers

A page built once at deploy time (a "static" page) is fast and cheap, but its numbers freeze at build time. This homepage uses **incremental regeneration**: visitors get the cached page, and at most once a minute a visit triggers a background rebuild with fresh totals. A donation shows up within about a minute. If the database is down during a rebuild, the old page keeps being served instead of an error. That's the stale-while-revalidate pattern, the same idea as HTTP's `Cache-Control: stale-while-revalidate`.
