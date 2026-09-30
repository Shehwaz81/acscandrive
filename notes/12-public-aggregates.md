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

In this app, one server-only function (`getHomepageData()`) is that boundary. Today it returns demo numbers. Later its body will query the database. Because every section gets its figures from that one function, there is one place to check what leaves.

## Aggregates can still leak

A total is not automatically anonymous:

- **Small groups.** If a homeroom has one donation so far, its "total" is that student's donation.
- **Differences over time.** A total that jumps by 40 right after someone was seen at the desk tells you what they gave.
- **Named lists are a disclosure by design.** "Top donors" publishes names and amounts on purpose, so it needs the organizer's decision on how names appear (for example, first name + initial) and whether students can opt out.

For a school can drive, these risks are small and accepted. But they are real choices, not side effects.

## One source for every figure

The hero's fill level, its number, "62% there" and "7,520 to go" are all computed from the same two values, goal and total. If each piece computed its own figures, they could disagree (for example, rounding up to "100%" while 10 cans are still missing). This is the same idea as note 11's derived totals: store or fetch the base facts once, and derive everything else from them.

## Static pages and fresh numbers

A page built once at deploy time (a "static" page) is fast and cheap, but its numbers freeze at build time. Once totals come from the database, the page needs either a short re-generation window (for example, rebuild at most once a minute) or rendering on every request. For a school site, a minute of delay is a good trade for serving mostly cached pages.
