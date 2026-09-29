# Serving private data through your own server

How the volunteer search reaches the real `students` table, and the general ideas behind each choice.

## The path

```
browser  ──GET /api/volunteer/students?q=ma──▶  your server  ──secret key──▶  database
browser  ◀──── 20 matches: name, grade, homeroom ───  your server
```

The browser never talks to the database and never holds the secret key. Your server is the only thing trusted with the key, so it decides exactly what leaves: which rows, which columns, how many.

The alternative is letting the browser query the database directly with the public key, with row-level security deciding what it may see (note 03). That works too, but only once there are logins and policies. Until then, a server in the middle is the only place a rule can live.

## An endpoint without a check is public

A URL like `/api/volunteer/students` is reachable by anyone who can reach the site, whether or not your UI links to it. Hiding a page, or only calling the endpoint from a "protected" screen, protects nothing: `curl` doesn't load your UI.

Access control must run **on the server, on every request, at every entry point**: the page and each API route separately. Here the `/volunteer` layout calls `requireVolunteer()`, and each roster route checks `getVolunteer()` itself and answers 401 without a valid session (note 10). Before login existed, the roster routes were a merge blocker for exactly this reason: the code worked, but anyone could have searched the roster.

## Send the minimum

Every response is a copy of private data that you no longer control: browser memory, extensions, screenshots, caches. So:

- **Columns:** select only what the screen shows (`hr_teacher` is never read).
- **Rows:** cap results. "a" matches 321 students; the server sends 20 plus the count ("20 of 321") and asks the volunteer to type more.
- **Caching:** mark responses `Cache-Control: private, no-store` so no shared cache or browser disk keeps a copy.

## Silent truncation

Many APIs cap how many rows one request returns. Supabase's default is 1,000. The roster has 1,113 rows, so a plain "select everything" returns 1,000 **with no error**, and 113 students would just never show up in search.

The fix is **pagination**: ask for rows 0–999, then 1000–1999, until a page comes back short. The general lesson is that an API returning *fewer* rows than you asked for is not an error to it, so check limits and test with more data than the cap.

## Reads vs writes

The search uses `GET`, which by HTTP convention is **safe**: it changes nothing, so it can be repeated, retried, or cancelled freely. That fits search-as-you-type, where each keystroke fires a new request and old ones are simply ignored. Writes (saving a donation) are different; they need the idempotency key from note 08.

## "Failed" is not "empty"

If the request fails, the honest answer is "search isn't working", not "no student matches". An empty result tells the volunteer the student doesn't exist, which could lead them to log the donation under someone else. So the UI treats an error as its own state, with a retry, and never lets Enter pick from an older list while the latest request failed.

## Small data: search in memory

About 1,100 short rows is tiny, so the server reads the whole table and runs the same matching code the prototype used. Pushing the search into the database (trigram indexes, `pg_trgm`) is faster for large tables but needs a schema change. The right tool depends on size; measure before optimising.
