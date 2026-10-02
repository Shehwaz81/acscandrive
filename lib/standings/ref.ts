import { createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";

/**
 * Student refs for the standings page: the student's id, encrypted and
 * authenticated (AES-256-GCM), like `lib/claims-ref.ts` but under its own key
 * namespace, so a claim-picker ref is not a standings ref or the reverse.
 *
 * Unlike claim refs these are deterministic: the nonce is derived from the id,
 * so one student always gets the same ref. That keeps `?student=<ref>` links
 * stable and lets the page tell that the open student is a row in the table.
 * Nothing is lost by it here: the page shows the full name beside every ref.
 * The secret is a parameter so tests can run without the environment.
 */

const key = (secret: string) => createHash("sha256").update(`standings:${secret}`).digest();

export function sealStudentRef(studentId: number | string, secret: string): string {
  const k = key(secret);
  const text = String(studentId);
  // The nonce only repeats for the same plaintext, which gives the same ciphertext.
  const iv = createHmac("sha256", k).update(`nonce:${text}`).digest().subarray(0, 12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The student id, or null if the ref was altered, made up or sealed for something else. */
export function openStudentRef(ref: string, secret: string): string | null {
  try {
    const raw = Buffer.from(ref, "base64url");
    if (raw.length < 29 || raw.length > 64) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    return /^\d{1,18}$/.test(text) ? text : null;
  } catch {
    return null;
  }
}
