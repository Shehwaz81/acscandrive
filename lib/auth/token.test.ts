import { describe, expect, it } from "vitest";
import { SESSION_SECONDS, createToken, readToken } from "./token";

const SECRET = "test-secret-that-is-at-least-32-characters";
const NOW = 1_800_000_000_000;

describe("session token", () => {
  it("round-trips a username", () => {
    expect(readToken(createToken("desk", SECRET, NOW), SECRET, NOW)).toBe("desk");
  });

  it("rejects a token whose username was changed", () => {
    const [, expiresAt, signature] = createToken("desk", SECRET, NOW).split(".");
    expect(readToken(`other.${expiresAt}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("rejects a token whose expiry was extended", () => {
    const [username, expiresAt, signature] = createToken("desk", SECRET, NOW).split(".");
    const later = Number(expiresAt) + 86_400_000;
    expect(readToken(`${username}.${later}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("rejects a forged signature", () => {
    const [username, expiresAt] = createToken("desk", SECRET, NOW).split(".");
    expect(readToken(`${username}.${expiresAt}.forged`, SECRET, NOW)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createToken("desk", "another-secret-that-is-32-characters-long", NOW);
    expect(readToken(token, SECRET, NOW)).toBeNull();
  });

  it("expires after the session length", () => {
    const token = createToken("desk", SECRET, NOW);
    expect(readToken(token, SECRET, NOW + SESSION_SECONDS * 1000 - 1)).toBe("desk");
    expect(readToken(token, SECRET, NOW + SESSION_SECONDS * 1000)).toBeNull();
  });

  it.each(["", "desk", "desk.123", "a.b.c.d", "desk.notanumber.sig"])(
    "rejects malformed token %j",
    (token) => {
      expect(readToken(token, SECRET, NOW)).toBeNull();
    },
  );
});
