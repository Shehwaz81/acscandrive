// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sealStudentRef as sealClaimRef } from "../claims-ref";
import { openStudentRef, sealStudentRef } from "./ref";

const SECRET = "test-secret-that-is-long-enough-000000";

describe("standings student refs", () => {
  it("round-trip the id without showing it, and stay the same for one student", () => {
    const ref = sealStudentRef(1429, SECRET);
    expect(ref).not.toContain("1429");
    expect(openStudentRef(ref, SECRET)).toBe("1429");
    expect(sealStudentRef("1429", SECRET)).toBe(ref);
    expect(sealStudentRef(1430, SECRET)).not.toBe(ref);
  });

  it("reject altered, made-up, other-secret and claim-picker refs", () => {
    const ref = sealStudentRef(7, SECRET);
    const flipped = ref.slice(0, -2) + (ref.at(-2) === "A" ? "B" : "A") + ref.at(-1);
    expect(openStudentRef(flipped, SECRET)).toBeNull();
    expect(openStudentRef("7", SECRET)).toBeNull();
    expect(openStudentRef("", SECRET)).toBeNull();
    expect(openStudentRef("x".repeat(500), SECRET)).toBeNull();
    expect(openStudentRef(ref, "another-secret-that-is-long-enough-00")).toBeNull();
    expect(openStudentRef(sealClaimRef(7, SECRET), SECRET)).toBeNull();
  });
});
