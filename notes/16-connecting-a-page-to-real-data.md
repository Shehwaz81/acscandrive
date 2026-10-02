# Connecting a page to real data

## The path a number takes

Every figure on a page started as a row in a database and crossed several boundaries to reach the screen. Naming each boundary, and what is allowed across it, is most of what "connecting a page to the backend" means.

```
browser ──► your server ──► server-only loader ──► database
        ◄──              ◄──                    ◄──
   public shapes      public shapes           private rows
```

There are two ways the browser gets data, and most pages use both.

1. **With the page (server render).** The server runs the loader, builds the HTML with the numbers already in it, and sends that. The browser didn't ask a question; it just received a finished page. This suits data everyone sees and that can be a little stale, because the result can be cached and rebuilt every so often.
2. **On demand (a request to a route handler).** The page's JavaScript calls a URL on your server, the handler runs the loader, and JSON comes back. This suits data that depends on what the visitor does, such as a search.

Walking the boundaries from right to left:

- **Database → loader.** Private rows: internal ids, every column, every student. The loader holds the powerful key (see [note 03](03-database-access-control.md)), so nothing in the database stops it from reading everything.
- **Loader → server code.** The loader is where rows become *public shapes*: totals, ranks, a display name, an opaque token instead of an id. This is the boundary that matters. If a field isn't in the shape the loader returns, no later mistake can leak it (see [note 12](12-public-aggregates.md)). Marking the module "server only" makes the build fail if browser code ever imports it.
- **Server → browser.** Only the public shapes, as HTML or JSON. Assume everything that crosses here is public forever: anyone can open the network tab or call the URL directly, whatever the page chooses to display ([note 01](01-where-code-runs.md)).
- **Browser → server.** Untrusted input: a search string, a token from a link. The server checks length and validity itself, because the request might not have come from your page at all.

In this app, the Student Standings page gets its podium and top-25 table with the page (rebuilt at most once a minute), and gets search results and one student's details on demand from two route handlers. All three go through the same server-only loader, so there is one place where rows turn into public shapes.

## What the repository interface is for

The page's components never call `fetch` or a database client. They call an **interface**: a short list of questions the UI is allowed to ask.

```
searchStudents(query)   → a few matches
getStudentProfile(ref)  → one student's public details
```

Anything that can answer those two questions with the right shapes can sit behind the UI. That is why the page could be designed, built and tested before any real data was connected: the first implementation answered from a list of made-up students held in memory, and a later one answers by calling the route handlers. The components can't tell the difference, because the difference is on the other side of the interface.

Three things make the swap nearly free:

- **The shapes are agreed first.** Both implementations return the same types. The UI is written against the types, not against where the data came from.
- **The same calculation runs in both.** The fake data wasn't a set of hand-typed totals. It was fake *rows* pushed through the real ranking code, so the arithmetic was already exercised.
- **Failure is part of the interface.** "Not found" and "couldn't load" are defined outcomes, so the UI already handled them before a real network could produce them.

[Note 08](08-idempotency-and-interfaces.md) covers the same idea for the volunteer desk. The general name is a *seam*: a place where you can change what's behind the code without editing the code.

## Why fake data belongs in test fixtures, not in the app

Fake data is useful twice: while designing the page, and forever after in tests. Only the second use should survive.

- **A fake that can be switched on can be switched on by accident.** If the shipped app contains a demo mode, a missing or misspelled setting can put invented names and totals on a page people believe. For a results page, plausible wrong numbers are worse than an error.
- **Shipped code is attack surface and maintenance.** A URL parameter that picks a demo scenario is one more input to reason about. Code paths that only run in demo mode still have to be kept compiling and still confuse the next reader.
- **Tests need data that never changes.** A test that says "the leader has 46 cans and is ranked 29th all-time" needs fixed students, fixed donations and a fixed clock. Real data can't give that, and real people's records must never be copied into a repository.

So the made-up students moved to a *fixture* file: data that exists only for tests. The rule that keeps it honest is one-directional: tests may import fixtures, the app may not. That's checkable by searching for imports of the file.

## Removing a flag is a decision

Before this change a setting chose between fake and real data, and the default was fake. The route handlers also refused to answer unless the setting said "real". Together those were an **off switch**: real names could not be served by accident.

Here is what was removed:

- the setting and the code that read it;
- the check in each route handler that returned "not found" while the setting was off;
- the "demo data" banner;
- the URL parameter that picked a demo scenario, and the page-level "loading" state that only a scenario could produce (real data arrives with the page, so it is never loading);
- the in-memory fake repository, as far as the app is concerned.

Deleting a flag feels like tidying, but it changes what can go wrong. With the flag, the failure mode was "the page shows fake data when it should show real data". Without it, there is no configuration that hides the data: the only ways to stop publishing are to remove the page or put it behind a login, and both need a deploy. That's the right trade once the decision to publish is final, because it removes the worse failure (fake results that look real) and one piece of configuration that must match in every environment. But it should be made on purpose and written down, not arrived at as a side effect of cleanup.

A useful habit: when deleting a flag, write one sentence saying what the flag was protecting against and who decided that protection is no longer needed.

## Checking that a page reads real data

"It looks right" doesn't prove where the numbers came from. Better checks:

- **Compare a count with the database.** The page states how many students it searches. Ask the database for the same count directly. Matching numbers that you didn't type anywhere in the code are strong evidence.
- **Change something and watch it appear.** Record a donation for a test entry, wait for the cache period, reload. A fake dataset never changes.
- **Try what only the fake supported.** Add the old demo parameter to the URL. Nothing should happen.
- **Read the responses, not the screen.** Open the network tab or call the URLs directly and look at the *shape*: which keys are present, how many items, what status code. Search the raw response and the page source for field names that must never appear (internal ids, bookkeeping timestamps). The screen only shows what the UI chose to draw; the response shows what was published.
- **Probe the edges.** One letter should return nothing, two should return a short list. A token with one character changed should return "not found", not someone else's record.
- **Check the empty case honestly.** With no donations recorded, the page should say so ("no donations yet"), not show zeros dressed up as results. And "couldn't load" must look different from "nothing there" ([note 09](09-serving-private-data-through-your-server.md)).

When checking a page that shows real people, check shapes, counts and status codes. Don't paste names or records into logs, screenshots or notes.
