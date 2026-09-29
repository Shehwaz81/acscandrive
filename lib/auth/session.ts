import "server-only";
import { cookies } from "next/headers";
import { SESSION_SECONDS, createToken, readToken } from "./token";

const COOKIE = "volunteer_session";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  // Fail closed: without a strong secret anyone could forge a session.
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  return value;
}

export async function startSession(username: string): Promise<void> {
  (await cookies()).set(COOKIE, createToken(username, secret()), {
    httpOnly: true, // page JavaScript can't read it
    secure: process.env.NODE_ENV === "production", // HTTPS only (localhost is plain HTTP)
    sameSite: "lax", // not sent on cross-site form posts
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in admin's username, or null. */
export async function getVolunteer(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? readToken(token, secret()) : null;
}
