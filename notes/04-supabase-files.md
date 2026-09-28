# The Supabase files, one by one

Each file exists because of a concept from notes 01–03. The question for each is the same: **where does it run, which key does it hold, and where does it keep the session?**

| File | Runs on | Key | Session comes from | RLS |
| --- | --- | --- | --- | --- |
| `lib/supabase/client.ts` | Browser | Publishable | `document.cookie` (the browser's cookie jar) | Applies |
| `lib/supabase/server.ts` | Server, per request | Publishable | The incoming request's `Cookie` header | Applies |
| `lib/supabase/admin.ts` | Server only | **Secret** | None (acts as `service_role`) | **Bypassed** |
| `lib/supabase/proxy.ts` + `proxy.ts` | Server, before every request | Publishable | Request cookies in, `Set-Cookie` out | n/a |
| `lib/supabase/database.types.ts` | Nowhere (types only) | — | — | — |

## `client.ts`: the browser client

It runs in the user's browser, so it can only hold the public key. It reads and writes the session through the browser's own cookie storage. Anything it fetches is limited by RLS to what that user's role may see. It's used for interactive features that talk to Supabase directly from the page; none exist yet.

## `server.ts`: the per-request server client

It runs on the server, but **on behalf of one visitor**. The server has no cookie jar of its own. Each incoming request carries that visitor's cookies, so the client is built fresh for every request from that request's cookies. That's why it's a function (`createClient()`) called inside a request, not a single shared object. If one client were shared across requests, one user's session could leak into another user's request.

It still uses the publishable key, so the database treats it as that visitor: `anon` or `authenticated`, and RLS applies. Use it by default for server-side queries.

The `setAll` method is wrapped in `try/catch` because some stages of rendering can't write response headers any more (see "headers before body" in [02](02-sessions-cookies-jwts.md)). That's fine, because the proxy has already refreshed the cookie.

## `admin.ts`: the privileged client

Server-only, with the secret key, running as `service_role`. It bypasses RLS, so:

- The code that calls it must first confirm the caller is allowed (for example, is a volunteer).
- It must return only intended fields, such as aggregates, never raw private rows.
- `import "server-only"` makes the build fail if browser code ever imports it.
- `persistSession: false` because there's no user session to store. It *is* the server.

## `proxy.ts` / `lib/supabase/proxy.ts`: the session refresher

This is the **interceptor** (middleware) pattern: code that runs before every request reaches the page or API that handles it. On each request it:

1. Reads the session cookies from the request.
2. Calls `getClaims()`, which verifies the access token and, if it has expired, uses the refresh token to get a new pair.
3. Writes any new tokens onto both the request (so code later in the same request sees them) and the response (as `Set-Cookie`, so the browser stores them).

It exists because tokens expire about hourly and refresh tokens are single-use. Refreshing has to happen before any page output starts, and doing it in one place avoids many parts of a page racing to refresh the same token. The `matcher` skips static files like images, which never need a session.

Right now nobody logs in, so it mostly does nothing. It becomes essential once volunteer auth exists.

## `database.types.ts`: the schema as types

It's generated from the live database. It tells TypeScript that `students.grade` is a `number`, that `donation_logs.amount_cents` can be `null`, and so on. Passing it as `createClient<Database>(...)` means a typo like `.from("studnets")` or a wrong column type becomes a compile error.

It's a *snapshot*. If the schema changes and you don't regenerate it, the types will confidently lie. Regenerate it after every migration.

## Why three clients instead of one?

Each combination of *where it runs* × *which key it holds* × *where the session lives* is a different security situation. One "universal" client would have to either hold the secret key in the browser (catastrophic) or be unable to act as the visitor on the server (useless). Separate files make the choice explicit at every call site.
