import { describe, expect, it } from "vitest";
import { findSameNames, levenshtein, normalize, searchStudents } from "./search";
import { seedStudents } from "./seed";
import type { Student } from "./types";

const students = seedStudents();
const names = (list: Student[]) => list.map((s) => `${s.firstName} ${s.lastName} ${s.homeroom}`);

describe("normalize", () => {
  it("lowercases and strips accents, apostrophes and extra spaces", () => {
    expect(normalize("  O'Brien ")).toBe("obrien");
    expect(normalize("Chloé  TREMBLAY")).toBe("chloe tremblay");
    expect(normalize("D’Angelo-Smith")).toBe("dangelo smith");
  });
  it("computes edit distance", () => {
    expect(levenshtein("maya", "mya")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("searchStudents", () => {
  it("matches every token as a word prefix, sorted by last, first, grade", () => {
    const r = searchStudents(students, "anna ng");
    expect(names(r.exact)).toEqual(["Anna Nguyen 10C", "Anna Nguyen 12E"]);
    expect(names(searchStudents(students, "o'brien").exact)).toEqual(["Liam O'Brien 12A"]);
    expect(names(searchStudents(students, "obri").exact)).toEqual([
      "Liam O'Brian 9B",
      "Liam O'Brien 12A",
    ]);
    expect(names(searchStudents(students, "chloe").exact)).toEqual(["Chloé Tremblay 10D"]);
  });

  it("finds near spellings once the query has 4 characters", () => {
    expect(searchStudents(students, "mya").similar).toEqual([]);
    const r = searchStudents(students, "maya rodriguez");
    expect(names(r.exact)).toEqual(["Maya Rodriguez 11A"]);
    expect(names(r.similar)).toEqual(["Maya Rodrigues 9C", "Mya Rodriguez 12B"]);
  });

  it("uses per-token distance for long tokens", () => {
    // "lopes" is one edit from "lopez"
    const r = searchStudents(students, "lopes");
    expect(names(r.exact)).toEqual(["Sophia Lopes 12C"]);
    expect(names(r.similar)).toEqual(["Sofia Lopez 9D"]);
  });

  it("includes names within two edits of an exact match", () => {
    const r = searchStudents(students, "anna");
    expect(names(r.similar)).toContain("Anh Nguyen 9A");
  });

  it("allows two edits on the whole name for queries of 8+ characters", () => {
    const r = searchStudents(students, "danyelle kin");
    expect(r.exact).toEqual([]);
    expect(names(r.similar)).toContain("Danielle Kim 11D");
  });

  it("caps similar results at 4 and never repeats an exact match", () => {
    const r = searchStudents(students, "lucas");
    expect(r.similar.length).toBeLessThanOrEqual(4);
    const exactIds = new Set(r.exact.map((s) => s.id));
    expect(r.similar.some((s) => exactIds.has(s.id))).toBe(false);
  });

  it("returns nothing for a blank query or an unknown name", () => {
    expect(searchStudents(students, "   ")).toEqual({ exact: [], exactTotal: 0, similar: [] });
    expect(searchStudents(students, "zzzzqq")).toEqual({ exact: [], exactTotal: 0, similar: [] });
  });

  it("caps exact matches but reports the full count", () => {
    const many = Array.from({ length: 45 }, (_, i) => ({
      id: `x${i}`,
      firstName: "Sam",
      lastName: `Tester${String(i).padStart(2, "0")}`,
      grade: 9 as const,
      homeroom: "9A",
    }));
    const r = searchStudents(many, "sam");
    expect(r.exact).toHaveLength(20);
    expect(r.exactTotal).toBe(45);
    expect(r.exact[0].lastName).toBe("Tester00");
  });
});

describe("findSameNames", () => {
  it("groups identical normalized names", () => {
    const groups = findSameNames(students);
    expect([...groups.keys()]).toEqual(["anna nguyen"]);
    expect(groups.get("anna nguyen")).toHaveLength(2);
  });
});
