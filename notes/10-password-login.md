# Password login from scratch

The volunteer desk uses the simplest login that is still safe: a table of usernames and password hashes, and a signed cookie. This note explains each piece in general terms. The same ideas sit under every "real" auth product.

## The two jobs of a login

1. **Authentication, once:** prove who you are, here with a username and password.
2. **Staying signed in:** HTTP forgets everything between requests (note 02). After step 1, the server hands the browser a **session token**, and the browser sends it back with every request.

Step 1 is slow and rare. Step 2 happens on every page load, so it has to be cheap.

## Never store the password: store a hash

A **hash function** turns input into a fixed-size fingerprint and can't be run backwards. To check a login, you hash the attempt and compare the fingerprints. The database never holds the password, so a leaked table doesn't hand out passwords directly.

Hashing is not **encryption**. Encryption is reversible with a key, and hashing isn't reversible at all. Passwords should be hashed, because nobody, including you, ever needs the original back.

Two more ingredients make hashing safe for passwords:

- **Salt.** This is a random value mixed into each password before hashing, and stored next to the hash. Two people with the password `cans2026` get different hashes, so an attacker can't use one precomputed table of common passwords (a "rainbow table") against everyone at once.
- **Deliberate slowness.** General hashes like SHA-256 are built to be fast, around billions per second on a GPU, which makes guessing cheap. Password hashes like **bcrypt** (used here), scrypt and Argon2 are slow on purpose and have a tunable **cost**. `gen_salt('bf', 12)` means 2¹² rounds, which takes a fraction of a second for one login and is painful for millions of guesses.

A bcrypt hash looks like `$2a$12$<22-char salt><31-char hash>`. The algorithm, cost and salt are stored inside the string itself. That's why checking needs only `crypt(attempt, stored_hash) = stored_hash`: `crypt` reads the salt and cost back out of the stored hash.

In this app, Postgres does the hashing (the `pgcrypto` extension). `add_admin()` hashes and stores a new admin's password, and `verify_admin()` does the comparison, both inside the database.

Reading `extensions.crypt('pw', extensions.gen_salt('bf', 12))` from the inside out:

1. `gen_salt('bf', 12)` makes a fresh random salt for bcrypt (`bf`, from Blowfish) at cost 12.
2. `crypt(password, salt)` hashes the password with it.
3. `extensions.` is the schema, a namespace like a folder, where Supabase installs add-on packages.

## Why logic lives in database functions

`CREATE FUNCTION` is standard SQL, and Postgres, SQL Server, MySQL and Oracle all support it (SQLite doesn't). Here, functions do two jobs:

- **The API only exposes tables, views and functions.** Supabase's client can't send an arbitrary SQL string, so custom logic like "hash this attempt and compare" has to be a function the app calls by name (`rpc`).
- **Permissions can be narrower than the table's.** A role can be allowed to *call* `verify_admin()` and get back only `true`/`false`, without being able to read the hashes. `add_admin()` is locked further: no API role may call it at all. The table also rejects any `password_hash` that doesn't start with `$2`, which catches someone pasting a plaintext password by mistake.

## Who may ask "is this password right?"

A password-checking function is a guessing machine. If the public (publishable) key could call it, anyone could script guesses against it straight from the internet. So `verify_admin()` is executable only by the server's secret role (note 03). The only way to reach it is the login form's server action.

The error message is the same for "no such user" and "wrong password", so the form doesn't reveal which usernames exist.

## The session token: signed, not secret

After a correct password, the server sets a cookie:

```
volunteer_session = desk.1790000000000.Q2xhdWRl…
                    │    │             └ signature
                    │    └ expires at (ms since 1970)
                    └ username
```

Anyone can read this token. What matters is that **nobody can change or invent one**. The signature is an **HMAC**: a hash of `username.expiresAt` mixed with a secret key (`SESSION_SECRET`) that only the server knows. On every request the server recomputes the HMAC and compares it:

- Change the username or push the expiry later, and the signature no longer matches.
- Without the secret, you can't compute a valid signature for a new token.

This is the same idea as a JWT's signature (note 02), with fewer parts. The payload is **signed, not encrypted**, so never put anything secret in it. The comparison uses a *constant-time* equality check, so an attacker can't learn how many leading characters of a guessed signature were right by timing the response.

Cookie flags used:

- `HttpOnly`: page JavaScript can't read the cookie, so an injected script can't steal the session.
- `SameSite=Lax`: other websites can't make your browser submit a form to us *with* the cookie attached. This is the basic defence against cross-site request forgery.
- `Secure` (production): the cookie is only sent over HTTPS.
- `Max-Age` of 12 hours: after that, the browser drops it, and the server also rejects the expiry inside the token.

## Stateless sessions and their one weakness

The server stores nothing per session, because the token carries everything needed to check it. That's called a **stateless session**. Its advantage is no sessions table and no lookup per request.

The weakness is **revocation**. A valid token stays valid until it expires, even if you delete that admin's row, because the server never looks the user up again. You have two levers:

- Wait for expiry (at most 12 hours here).
- Rotate `SESSION_SECRET`. Every existing signature becomes wrong, so *everyone* is signed out immediately.

A **stateful session** (random ID in the cookie, a row in a `sessions` table) can revoke one person instantly, at the cost of a database read on every request. For a handful of trusted volunteers during a school drive, stateless is the simpler trade.

## Check at every door

The login only protects what checks it. In this app, the check runs in the `/volunteer` layout, and separately at the top of each `/api/volunteer/*` route (note 09). A future server action that saves a donation must check again itself. Server actions and API routes are just URLs, and `curl` never loads your layout.

## What this deliberately doesn't do

- **Rate limiting / lockout:** nothing stops a script from trying many passwords against the login form. bcrypt makes each guess slow, but a long password is the real defence.
- **Per-person accountability:** with a shared login, the app can't tell which volunteer made an entry.
- **Self-service password reset:** changing a password is one SQL `update` (see `CLAUDE.md`).
