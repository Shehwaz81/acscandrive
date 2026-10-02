import { describe, expect, it } from "vitest";
import type { LogRow } from "../homepage";
import type { Grade, Student } from "../volunteer/types";
import { buildGradeWars } from "./build";

// Synthetic roster: never real students in tests.
const students: Student[] = [
  { id: "1", firstName: "Ada", lastName: "Quill", grade: 9, homeroom: "204" },
  { id: "2", firstName: "Ben", lastName: "Stone", grade: 9, homeroom: "204" },
  { id: "3", firstName: "Cy", lastName: "Ward", grade: 11, homeroom: "P3" },
  { id: "4", firstName: "Dee", lastName: "Yu", grade: 8 as Grade, homeroom: "12" },
];

// October 2026 is EDT (UTC-4): "2026-10-07 12:00" Toronto is 16:00Z.
const toronto = (date: string, time = "12:00:00") => new Date(`${date}T${time}-04:00`);
const cans = (student: number, n: number, at: Date): LogRow => ({
  student_id: student,
  can_count: n,
  amount_cents: null,
  occurred_at: at.toISOString(),
});
const cash = (student: number, cents: number, at: Date): LogRow => ({
  student_id: student,
  can_count: null,
  amount_cents: cents,
  occurred_at: at.toISOString(),
});

const build = (logs: LogRow[], now: Date) => buildGradeWars(students, logs, now);
const dates = (logs: LogRow[], now: Date) => build(logs, now).days.map((d) => d.date);
/** The four [grade, cans, cashCents, total] rows for a day. */
const day = (logs: LogRow[], now: Date, date: string) =>
  build(logs, now)
    .results.find((r) => r.day.date === date)!
    .totals.map((t) => [t.grade, t.cans, t.cashCents, t.total]);

describe("buildGradeWars", () => {
  describe("status", () => {
    it("keeps today in progress until 8:10:00 a.m. Toronto, then final", () => {
      const before = build([], toronto("2026-10-07", "08:09:59"));
      expect(before.days.map((d) => [d.date, d.status])).toEqual([
        ["2026-10-05", "final"],
        ["2026-10-06", "final"],
        ["2026-10-07", "in_progress"],
      ]);
      expect(build([], toronto("2026-10-07", "08:10:00")).days.at(-1)!.status).toBe("final");
    });

    it("counts logs by Toronto day, including entries after the cutoff", () => {
      const lateEntry = cans(1, 5, toronto("2026-10-07", "14:30:00"));
      // 23:30 Toronto is already the 8th in UTC; it still belongs to the 7th.
      const lateNight = cans(1, 2, toronto("2026-10-07", "23:30:00"));
      expect(day([lateEntry, lateNight], toronto("2026-10-08"), "2026-10-07")[0]).toEqual([9, 7, 0, 7]);
    });
  });

  describe("weekends", () => {
    it("ignores Saturday logs and never lists a weekend day", () => {
      const r = build([cans(1, 10, toronto("2026-10-10"))], toronto("2026-10-13"));
      expect(r.days.map((d) => d.date)).toEqual(["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13"]);
      expect(r.results.every((res) => res.totals.every((t) => t.total === 0))).toBe(true);
    });

    it("ends on Friday when today is Sunday", () => {
      const r = build([], toronto("2026-10-11"));
      expect(r.days.map((d) => d.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
      expect(r.days.every((d) => d.status === "final")).toBe(true);
    });
  });

  describe("last five days", () => {
    it("lists the five most recent weekdays ending today, ascending, with empty days zero-filled", () => {
      const now = toronto("2026-10-14");
      expect(dates([], now)).toEqual(["2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14"]);
      // Thanksgiving Monday: no logs, still a day, four zero rows in grade order.
      expect(day([], now, "2026-10-12")).toEqual([
        [9, 0, 0, 0],
        [10, 0, 0, 0],
        [11, 0, 0, 0],
        [12, 0, 0, 0],
      ]);
    });
  });

  describe("drive window", () => {
    it("is empty before October 5", () => {
      expect(build([cans(1, 10, toronto("2026-10-02"))], toronto("2026-10-02"))).toEqual({ days: [], results: [] });
    });

    it("excludes logs before the start date", () => {
      const r = build([cans(1, 10, toronto("2026-10-02")), cans(1, 3, toronto("2026-10-05"))], toronto("2026-10-05"));
      expect(r.days.map((d) => d.date)).toEqual(["2026-10-05"]);
      expect(r.results[0].totals[0].total).toBe(3);
    });

    it("shows Oct 19–23, all final, after the drive, and excludes later logs", () => {
      const r = build([cans(3, 10, toronto("2026-10-23")), cans(3, 99, toronto("2026-10-26"))], toronto("2026-10-30"));
      expect(r.days.map((d) => [d.date, d.status])).toEqual([
        ["2026-10-19", "final"],
        ["2026-10-20", "final"],
        ["2026-10-21", "final"],
        ["2026-10-22", "final"],
        ["2026-10-23", "final"],
      ]);
      expect(r.results.at(-1)!.totals[2]).toEqual({ grade: 11, cans: 10, cashCents: 0, total: 10 });
    });
  });

  describe("rounding, per student per day", () => {
    const now = toronto("2026-10-07");

    it("rounds $0.50 on each of two days to 0 each", () => {
      const logs = [cash(1, 50, toronto("2026-10-06")), cash(1, 50, toronto("2026-10-07"))];
      expect(day(logs, now, "2026-10-06")[0]).toEqual([9, 0, 50, 0]);
      expect(day(logs, now, "2026-10-07")[0]).toEqual([9, 0, 50, 0]);
    });

    it("rounds two students' $0.50 to 0, not 1", () => {
      const logs = [cash(1, 50, now), cash(2, 50, now)];
      expect(day(logs, now, "2026-10-07")[0]).toEqual([9, 0, 100, 0]);
    });

    it("combines one student's cans and cash on the same day", () => {
      const logs = [cans(1, 12, now), cash(1, 150, now), cash(1, 75, now)];
      // 12 cans + $2.25 → 12 + 2.
      expect(day(logs, now, "2026-10-07")[0]).toEqual([9, 12, 225, 14]);
    });
  });

  it("skips students missing from the roster or outside Grades 9–12", () => {
    const now = toronto("2026-10-07");
    const logs = [cans(99, 40, now), cans(4, 30, now), cans(3, 5, now)];
    expect(day(logs, now, "2026-10-07")).toEqual([
      [9, 0, 0, 0],
      [10, 0, 0, 0],
      [11, 5, 0, 5],
      [12, 0, 0, 0],
    ]);
  });
});
