import { createHmac, timingSafeEqual } from "node:crypto";

// A session token is "username.expiresAt.signature". The signature is an HMAC
// of "username.expiresAt" keyed with a server secret, so the browser can read
// the token but can't change it or make a new one. Usernames can't contain
// dots (see the admin table's check constraint).

export const SESSION_SECONDS = 12 * 60 * 60;

const sign = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export function createToken(username: string, secret: string, now = Date.now()): string {
  const value = `${username}.${now + SESSION_SECONDS * 1000}`;
  return `${value}.${sign(value, secret)}`;
}

/** Returns the username if the token is authentic and unexpired, else null. */
export function readToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [username, expiresAt, signature] = parts;

  const expected = Buffer.from(sign(`${username}.${expiresAt}`, secret));
  const actual = Buffer.from(signature);
  // timingSafeEqual takes the same time wherever the first difference is, so
  // response times don't leak how much of a guessed signature was right.
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  if (!(Number(expiresAt) > now)) return null;
  return username;
}
