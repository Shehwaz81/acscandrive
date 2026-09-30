import { describe, expect, it } from "vitest";
import { buildHomepageData, type LogRow, matchesQuery, ordinalSuffix, publicName } from "./homepage";
import type { Student } from "./volunteer/types";

// Synthetic roster: never real students in tests.
const students: Student[] = [
  { id: "1", firstName: "Ada", lastName: "Quill", grade: 9, homeroom: "204" },
  { id: "2", firstName: "Ben", lastName: "Stone", grade: 11, homeroom: "204" },
  { id: "3", firstName: "Cy", lastName: "Ward", grade: 10, homeroom: "P3" },
  { id: "4", firstName: "Dee", lastName: "Yu", grade: 12, homeroom: "12" },
];

// Noon on a school day in Toronto (EDT, UTC-4).
const NOW = new Date("2026-10-07T16:00:00Z");
const TODAY = "2026-10-07T14:00:00Z";
const LAST_WEEK = "2026-09-30T14:00:00Z";

const cans = (student: number, n: number, at = TODAY): LogRow => ({
  student_id: student,
  can_count: n,
  amount_cents: null,
  occurred_at: at,
});
const cash = (student: number, cents: number, at = TODAY): LogRow => ({
  student_id: student,
  can_count: null,
  amount_cents: cents,
  occurred_at: at,
});

const build = (logs: LogRow[], now = NOW) => buildHomepageData(students, logs, 20_000, now);

describe("buildHomepageData", () => {
  it("rounds partial dollars down per student, then sums", () => {
    // One student: $1.50 + $1.50 = $3.00 → 3. Two students: $1.50 each → 1 + 1.
    expect(build([cash(1, 150), cash(1, 150)]).total).toBe(3);
    const split = build([cash(1, 150), cash(2, 150)]);
    expect(split.total).toBe(2);
    expect(split.homerooms.find((h) => h.room === "204")).toMatchObject({ total: 2, cans: 0, cashCents: 300 });
  });

  it("keeps the school total equal to the sum of homerooms", () => {
    const d = build([cans(1, 12), cash(2, 1_050), cans(3, 4), cash(4, 99)]);
    expect(d.total).toBe(12 + 10 + 4 + 0);
    expect(d.total).toBe(d.homerooms.reduce((s, h) => s + h.total, 0));
  });

  it("lists every homeroom with its mixed grades and size, even with no logs", () => {
    const d = build([]);
    expect(d.total).toBe(0);
    expect(d.topDonors).toEqual([]);
    expect(d.homerooms.map((h) => h.room)).toEqual(["12", "204", "P3"]);
    expect(d.homerooms.find((h) => h.room === "204")).toMatchObject({ grades: [9, 11], students: 2 });
  });

  it("sorts homerooms by total, then by room code", () => {
    const d = build([cans(3, 5), cans(4, 5), cans(1, 9)]);
    expect(d.homerooms.map((h) => h.room)).toEqual(["204", "12", "P3"]);
  });

  it("ranks today's donors only, by their can-equivalents", () => {
    const d = build([cans(1, 40, LAST_WEEK), cans(2, 3), cash(3, 500), cash(4, 60)]);
    expect(d.topDonors).toEqual([
      { name: "Cy W.", room: "P3", cans: 5 },
      { name: "Ben S.", room: "204", cans: 3 },
    ]);
  });

  it("uses the Toronto day, not UTC", () => {
    // 11:59 PM Toronto on Oct 6 is Oct 7 in UTC; 12:01 AM Oct 7 is still Oct 7.
    const lateYesterday = "2026-10-07T03:59:00Z";
    const earlyToday = "2026-10-07T04:01:00Z";
    const d = build([cans(1, 7, lateYesterday), cans(2, 2, earlyToday)]);
    expect(d.topDonors.map((x) => x.name)).toEqual(["Ben S."]);
    expect(d.total).toBe(9);
  });

  it("sends no student ids or full last names", () => {
    const json = JSON.stringify(build([cans(1, 5), cans(2, 6)]));
    expect(json).not.toMatch(/Quill|Stone|student_id|"id"/);
  });
});

describe("helpers", () => {
  it("formats public names as first name + last initial", () => {
    expect(publicName({ firstName: " Maya ", lastName: "rossi" })).toBe("Maya R.");
  });

  it("matches grades inside mixed homerooms", () => {
    const h = { room: "205", grades: [9, 10, 12], students: 20, total: 0, cans: 0, cashCents: 0 };
    expect(matchesQuery(h, "grade 10")).toBe(true);
    expect(matchesQuery(h, "g11")).toBe(false);
    expect(matchesQuery(h, "20")).toBe(true);
  });

  it("uses the right ordinal for teens and twenties", () => {
    expect([1, 2, 3, 11, 12, 13, 21, 22, 23].map(ordinalSuffix)).toEqual([
      "st", "nd", "rd", "th", "th", "th", "st", "nd", "rd",
    ]);
  });
});
