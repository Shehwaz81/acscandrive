// @vitest-environment node
import { describe, expect, it } from "vitest";
import { openStudentRef, sealStudentRef } from "./claims-ref";

const SECRET = "test-secret-that-is-long-enough-000000";

describe("student refs", () => {
  it("round-trip the id without showing it", () => {
    const ref = sealStudentRef(1429, SECRET);
    expect(ref).not.toContain("1429");
    expect(openStudentRef(ref, SECRET)).toBe(1429);
  });

  it("differ each time, so a ref can't be matched to a student by comparing", () => {
    expect(sealStudentRef(7, SECRET)).not.toBe(sealStudentRef(7, SECRET));
  });

  it("reject altered, made-up or other-secret refs", () => {
    const ref = sealStudentRef(7, SECRET);
    const flipped = ref.slice(0, -2) + (ref.at(-2) === "A" ? "B" : "A") + ref.at(-1);
    expect(openStudentRef(flipped, SECRET)).toBeNull();
    expect(openStudentRef("7", SECRET)).toBeNull();
    expect(openStudentRef("", SECRET)).toBeNull();
    expect(openStudentRef(ref, "another-secret-that-is-long-enough-00")).toBeNull();
  });
});
