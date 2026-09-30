import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * A student reference for the claim picker: the student's id, encrypted and
 * authenticated (AES-256-GCM), so the browser can hand it back but can't read
 * the id or make one up. Server-only in practice; the secret is a parameter so
 * tests can run without the environment.
 */

const key = (secret: string) => createHash("sha256").update(`street-claims:${secret}`).digest();

export function sealStudentRef(studentId: number, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(String(studentId), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The student id, or null if the ref was altered, made up or sealed with another secret. */
export function openStudentRef(ref: string, secret: string): number | null {
  try {
    const raw = Buffer.from(ref, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    return /^\d{1,18}$/.test(text) ? Number(text) : null;
  } catch {
    return null;
  }
}
