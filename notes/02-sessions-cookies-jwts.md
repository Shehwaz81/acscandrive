# Sessions, cookies and JWTs

## HTTP forgets everything

HTTP is **stateless**. Each request is independent, and the server doesn't remember that the same person sent the previous one. "Being logged in" is therefore an illusion built from one idea: **the client attaches proof of identity to every request.**

## Cookies: how the proof travels

A **cookie** is a small named value the server asks the browser to store, using a `Set-Cookie` response header. After that, the browser automatically attaches it to every request to that site in a `Cookie` header. You don't write code to send it.

Useful cookie attributes:

- `Expires` / `Max-Age`: how long the browser keeps it.
- `HttpOnly`: JavaScript in the page can't read it, which limits the damage from injected scripts. Supabase's cookies are *not* HttpOnly, because the browser-side client needs to read the session too. That's a deliberate tradeoff.
- `Secure`: only sent over HTTPS.
- `SameSite`: controls whether other sites can trigger requests that carry the cookie (a defence against cross-site request forgery).

The alternative is `localStorage`: the browser keeps the token and your JavaScript adds it to requests by hand. The catch is that `localStorage` only exists in the browser, so a server rendering a page never sees it. That's why apps that render on the server keep the session in **cookies**: they're the one store that both the browser and the server can see on every request.

## JWTs: what the proof is

Supabase's proof of identity is a **JSON Web Token (JWT)**. It's three base64url-encoded parts joined by dots:

```
header.payload.signature
```

- **Header**: which algorithm signed it.
- **Payload** ("claims"): facts such as the user ID (`sub`), role (`authenticated`) and expiry time (`exp`). It's encoded, **not encrypted**, so anyone holding the token can read it. Never put secrets in a JWT.
- **Signature**: proves the auth server issued the header and payload, and that nobody has changed them since.

### How the signature is checked (public-key cryptography)

This project's Supabase keys are **asymmetric**. The auth server signs tokens with a **private key** only it holds. Anyone can verify them with the matching **public key**, which Supabase publishes as a **JWKS** (JSON Web Key Set) at a well-known URL.

The result: your server can confirm a token is genuine by checking the maths locally, with no network call to Supabase for every request. Changing even one character of the payload (say, `"role": "admin"`) breaks the signature.

Contrast with the older **symmetric** scheme (HS256), where one shared secret both signs and verifies. Every verifier then has to hold the secret, so it's easier to leak.

## Access tokens and refresh tokens

A signed token can't be "un-signed". If one is stolen, it stays valid until it expires. So there are two tokens:

| | Access token (the JWT) | Refresh token |
| --- | --- | --- |
| Lifetime | Short (about an hour by default) | Long |
| Sent | On every request | Only to the auth server, to get a new access token |
| Checked by | Anyone with the public key, offline | The auth server's database |
| Revocable | No, it expires instead | Yes |

Supabase refresh tokens are **single-use**: using one returns a new access token *and* a new refresh token. This is called rotation. If two requests try to refresh with the same old token at the same moment, the second one fails. That's one reason to do refreshing in one place (see the proxy in [04](04-supabase-files.md)).

## Why refreshing has to happen before the response starts

An HTTP response is sent as headers first and then the body. Cookies are headers. Once a server has started streaming the body (for example, HTML) to the browser, it can no longer add a `Set-Cookie` header. So the refreshed token has to be written by code that runs **before** any page content is produced. That's the job of a request interceptor (middleware, or "proxy" in this framework).

## `getSession` vs `getUser` vs `getClaims`

These three Supabase calls map onto the concepts above:

- `getSession()` reads the token from storage **without verifying it**. On a server, that means trusting a cookie the user could have forged. Don't use it for authorization decisions.
- `getUser()` sends the token to the auth server, which checks it and returns the user. It's trustworthy, but it costs a network round trip.
- `getClaims()` verifies the JWT signature **locally** using the JWKS, and refreshes the token if it has expired. It's trustworthy and fast. This project uses it.
