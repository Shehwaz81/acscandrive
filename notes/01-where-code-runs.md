# Where code runs and who to trust

## Two computers, one codebase

A web app is at least two programs running on different machines that talk over a network:

- **The client** is the user's browser, on the user's device. You ship code to it, but after that you don't control it. The user can read every byte you send, change variables in dev tools, and send any request they like with `curl`.
- **The server** is a machine you (or Vercel) control. Its memory, files and environment variables are private. Users only see what it chooses to send back.

Modern frameworks let one repository contain code for both. That's convenient but misleading: a file sitting next to another file tells you nothing about *where* it executes. Always ask: **does this line run on the user's device or on mine?**

## The trust boundary

The line between client and server is a **trust boundary**:

- Anything that arrives from the client is untrusted input. That includes form values, URL parameters, cookies and headers, even ones your own frontend code sent. Validate it on the server.
- Anything you send to the client is public. If a secret key, a private row or a hidden field reaches the browser, assume the user has it. Hiding it with CSS or not rendering it doesn't help.
- Checks done in the browser, like a disabled button or a hidden admin menu, are for **user experience**, not security. The real check has to happen somewhere the user can't modify: on the server or inside the database.

This is why the project rules say "UI visibility is not access control", and why homepage figures must be computed as aggregates on the server rather than by sending student rows to the browser and summing them there.

## Secrets and environment variables

Configuration such as URLs and keys lives in **environment variables**, not in code. That keeps secrets out of git, lets each environment (your laptop, production) have different values, and lets you rotate a key without changing code.

Build tools often have a convention for marking which variables may be copied into browser code. Here the prefix is `NEXT_PUBLIC_`, and other tools use `VITE_` or `PUBLIC_`. A marked variable is literally pasted into the JavaScript file users download. So:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public by design.
- `SUPABASE_SECRET_KEY` has no public prefix and must only ever be read by server code.

The general rule: **a value is either public or secret, and the build tool has to know which.** `.env` is git-ignored so secrets never reach the repository.

## Making mistakes fail loudly

A good defence turns a silent security bug into a build error. `lib/supabase/admin.ts` starts with `import "server-only"`. If any browser code ever imports it, even indirectly, the build fails instead of quietly shipping the secret key to users. Look for this pattern everywhere: types, database constraints and import guards all move errors earlier, to where they're cheap.
