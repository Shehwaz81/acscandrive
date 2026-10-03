# Why the old connection code didn't work

The original files were `utils/supabase/client.ts` and `utils/supabase/server.ts`. Both contained the same code:

```ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!);
```

There were four separate problems. They're worth understanding because each one is a general category of bug.

## 1. It imported a package that wasn't installed

`package.json` listed `@supabase/server`, but the code imported `@supabase/ssr`. They're different packages with similar names.

**How imports resolve:** `import "@supabase/ssr"` makes the build tool look for `node_modules/@supabase/ssr`. `node_modules` only contains what `package.json` and the lockfile say to install. The package wasn't there, so the import couldn't resolve.

**Why nothing crashed yet:** no page imported these files. A bundler only follows imports it reaches from an entry point, so unreachable files are never bundled and never fail. The type checker (`tsc`) looks at every file, though, and would have reported "Cannot find module '@supabase/ssr'". The first page to use the client would have broken the build.

**General lesson:** "it builds" only proves the code that's reachable works. Dead code can hide broken code. Run the type checker, which checks everything.

## 2. It was the wrong package for the job

`@supabase/server` is for backends that receive credentials in request **headers**, such as Edge Functions or small API servers, where each caller sends `Authorization: Bearer <token>`. A server-rendered website gets its session from **cookies** instead (see [02](02-sessions-cookies-jwts.md)). So even installed, it didn't match how this app authenticates users.

**General lesson:** before picking a library, identify the *mechanism* your situation uses (headers or cookies, browser or server) and choose a tool built for that mechanism.

## 3. The "server" file created a *browser* client

`server.ts` was a copy of `client.ts`, so it called `createBrowserClient`. A browser client expects to find the session in the browser's cookie storage. On a server there is no browser cookie storage. The visitor's cookies arrive in the request's `Cookie` header, and something has to hand them to the client explicitly.

This version of `@supabase/ssr` doesn't throw when a browser client runs outside a browser without cookie methods. It quietly behaves as if there are **no cookies at all**. So the server would never see anyone as logged in, and it would never write refreshed tokens back. Nothing errors, and the behaviour is just wrong.

**General lesson:** the worst bugs fail silently. Code that depends on its environment (browser vs server, one machine vs another) needs that environment passed in explicitly. The fixed `server.ts` does this: it builds the client from the current request's cookies.

## 4. `!` hid missing configuration

`supabaseUrl!` is TypeScript's non-null assertion: "trust me, this isn't undefined." It changes nothing at runtime. If an environment variable were missing (for example, not set on Vercel), the code would pass `undefined` along, and you'd get a confusing error somewhere deep in the library instead of a clear "SUPABASE_URL is not set".

The new files still use `!`, which is the common convention. The difference now is that the variables are documented and verified. A stricter version would check at startup and throw a clear error. If a misconfigured deploy ever bites you, that's the fix.

**General lesson:** types describe what you *believe*. Assertions like `!` or `as` switch off the checker exactly where your belief might be wrong.

## What the fix changed, conceptually

| Problem | Fix |
| --- | --- |
| Missing dependency | Installed `@supabase/ssr` and `@supabase/supabase-js`, removed `@supabase/server` |
| Wrong mechanism (headers) | Cookie-based clients from `@supabase/ssr` |
| Server acted like a browser | `server.ts` builds a per-request client from the request's cookies |
| No privileged path | `admin.ts`, guarded with `server-only` |
| Tokens never refreshed | `proxy.ts` refreshes before each request is handled |
| No proof it worked | A live check: secret key sees 1,113 students, publishable key sees 0 and can't insert |
