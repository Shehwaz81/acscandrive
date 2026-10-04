// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Grade, Student } from "../volunteer/types";
import {
  buildDressDown,
  buildHomeroomProgress,
  buildIndex,
  buildStandingsData,
  buildStudentProfile,
  searchStandings,
  type StandingsLog,
} from "./build";
import { dressDownStatus, homeroomStatus } from "./format";
import { mockIndex } from "./test-fixtures";
import { sealStudentRef } from "./ref";
import { DRESS_DOWN, dressDownWindows } from "./rules";

// Synthetic students only.
const st = (id: number, firstName: string, lastName: string, grade: number | null = 10, homeroom = "10A"): Student => ({
  id: String(id),
  firstName,
  lastName,
  grade: grade as Grade,
  homeroom,
});
/** Noon in Toronto on October 7, 2026, during the drive. */
const NOW = new Date("2026-10-07T16:00:00Z");
const TODAY = "2026-10-07T13:00:00Z";
const EARLIER = "2026-10-05T13:00:00Z";
const cans = (id: number, n: number, at = TODAY): StandingsLog => ({
  student_id: id,
  method: "cans",
  can_count: n,
  amount_cents: null,
  occurred_at: at,
});
const cash = (id: number, cents: number, at = TODAY): StandingsLog => ({
  student_id: id,
  method: "cash",
  can_count: null,
  amount_cents: cents,
  occurred_at: at,
});
const seal = (id: string) => `ref-${id}`;
const many = (n: number) => Array.from({ length: n }, (_, i) => st(i + 1, `First${i + 1}`, `Last${String(i + 1).padStart(2, "0")}`));
const data = (students: Student[], logs: StandingsLog[], now = NOW) =>
  buildStandingsData(buildIndex(students, logs, now), seal);

describe("today and all-time are separate rankings", () => {
  it("puts today's #1 on the shelf even when they are #29 all-time", () => {
    const students = many(30);
    const logs = [
      ...Array.from({ length: 28 }, (_, i) => cans(i + 1, 100 - i, EARLIER)),
      cans(29, 5, EARLIER),
      cans(29, 46),
      cans(3, 4),
    ];
    const d = data(students, logs);
    expect(d.today.entries.map((e) => [e.ref, e.total, e.rank])).toEqual([
      ["ref-29", 46, 1],
      ["ref-3", 4, 2],
    ]);
    expect(d.today.entries[0].allTimeRank).toBe(29);
    expect(d.today.donorCount).toBe(2);
    expect(d.allTime.rows).toHaveLength(25);
    expect(d.allTime.rows.some((r) => r.ref === "ref-29")).toBe(false);
    // Today's cans count toward all-time, but the all-time order never reaches the shelf.
    expect(d.allTime.rows[0]).toMatchObject({ ref: "ref-3", total: 102, rank: 1 });
    expect(d.allTime.donorCount).toBe(29);
  });

  it("uses the Toronto day, not UTC", () => {
    // 11:59 PM Toronto on Oct 6 is already Oct 7 in UTC.
    const d = data(many(2), [cans(1, 7, "2026-10-07T03:59:00Z"), cans(2, 2, "2026-10-07T04:01:00Z")]);
    expect(d.today.entries.map((e) => e.ref)).toEqual(["ref-2"]);
    expect(d.today.date).toBe("2026-10-07");
  });

  it("finds midnight after the clocks change (EST, not a fixed −4)", () => {
    // Daylight time ended Nov 1, 2026: Toronto midnight on Nov 2 is 05:00 UTC.
    const now = new Date("2026-11-02T15:00:00Z");
    const d = data(many(2), [cans(1, 7, "2026-11-02T04:59:00Z"), cans(2, 2, "2026-11-02T05:01:00Z")], now);
    expect(d.today.entries.map((e) => e.ref)).toEqual(["ref-2"]);
  });
});

describe("rounding and what counts", () => {
  it("rounds partial dollars down per student before anything is summed", () => {
    const index = buildIndex(many(2), [cash(1, 50), cash(2, 50)], NOW);
    const d = buildStandingsData(index, seal);
    expect(d.allTime.donorCount).toBe(0);
    expect(d.today.entries).toEqual([]);
    expect(buildHomeroomProgress(index, "10A").total).toBe(0);
  });

  it("rounds today's cash on its own, not as part of the all-time sum", () => {
    const d = data(many(1), [cash(1, 50, EARLIER), cash(1, 50)]);
    expect(d.allTime.rows[0].total).toBe(1);
    expect(d.today.entries).toEqual([]);
  });

  it("leaves out online logs, unknown students and grades outside 9–12", () => {
    const students = [st(1, "Ana", "Quill"), st(2, "Ben", "Stone", 8)];
    const online: StandingsLog = { ...cash(1, 5000), method: "online" };
    const d = data(students, [cans(1, 3), online, cans(2, 50), cans(99, 50)]);
    expect(d.allTime.rows.map((r) => [r.ref, r.total])).toEqual([["ref-1", 3]]);
    expect(d.rosterCount).toBe(1);
  });

  it("ranks staff (no grade, homeroom Teachers) with the students", () => {
    const students = [st(1, "Ana", "Quill"), st(2, "Bo", "Marsh", null, "Teachers")];
    const d = data(students, [cans(1, 3), cans(2, 9)]);
    expect(d.allTime.rows.map((r) => [r.ref, r.grade, r.homeroom, r.rank])).toEqual([
      ["ref-2", null, "Teachers", 1],
      ["ref-1", 10, "10A", 2],
    ]);
    expect(d.today.entries[0]).toMatchObject({ ref: "ref-2", total: 9 });
    expect(d.rosterCount).toBe(2);
  });
});

describe("ranks and ties", () => {
  it("shares a rank between equal totals and skips the next one", () => {
    const students = [st(1, "Ana", "Young"), st(2, "Ben", "Stone"), st(3, "Cy", "Adams"), st(4, "Di", "Brook"), st(5, "Ed", "None")];
    const d = data(students, [cans(1, 10), cans(2, 8), cans(3, 8), cans(4, 5)]);
    expect(d.allTime.rows.map((r) => [r.lastName, r.rank, r.tied])).toEqual([
      ["Young", 1, false],
      // Within a tie: by last name, for display only.
      ["Adams", 2, true],
      ["Stone", 2, true],
      ["Brook", 4, false],
    ]);
  });

  it("shows everyone tied at 25th and never pads a short table", () => {
    const logs = [
      ...Array.from({ length: 24 }, (_, i) => cans(i + 1, 100 - i)),
      cans(25, 9),
      cans(26, 9),
      cans(27, 9),
      cans(28, 4),
    ];
    const d = data(many(30), logs);
    expect(d.allTime.rows).toHaveLength(27);
    expect(d.allTime.rows.slice(-3).every((r) => r.rank === 25 && r.tied)).toBe(true);

    const few = data(many(30), [cans(1, 4), cans(2, 3), cash(3, 99)]);
    expect(few.allTime.rows.map((r) => r.total)).toEqual([4, 3]);
  });

  it("keeps the rest of a tie for 3rd close behind, with the shared rank", () => {
    const d = data(many(6), [cans(1, 9), cans(2, 7), cans(3, 5), cans(4, 5), cans(5, 5), cans(6, 1)]);
    expect(d.today.entries.map((e) => e.rank)).toEqual([1, 2, 3, 3, 3, 6]);
    expect(d.today.entries.slice(2, 5).every((e) => e.tied)).toBe(true);
  });
});

describe("dress-down progress", () => {
  const at = (iso: string) => new Date(iso);

  it("has one window per Friday in the drive", () => {
    expect(dressDownWindows("2026-10-05", "2026-10-23")).toEqual([
      { friday: "2026-10-09", windowStart: "2026-10-05", windowEnd: "2026-10-08" },
      { friday: "2026-10-16", windowStart: "2026-10-09", windowEnd: "2026-10-15" },
      { friday: "2026-10-23", windowStart: "2026-10-16", windowEnd: "2026-10-22" },
    ]);
  });

  it("shows the first Friday before the drive and the last one after it", () => {
    const before = buildDressDown([], at("2026-10-02T16:00:00Z"));
    expect(before).toMatchObject({ phase: "before", previous: null, current: { friday: "2026-10-09", closed: false } });
    const after = buildDressDown([], at("2026-10-30T16:00:00Z"));
    expect(after).toMatchObject({ phase: "ended", current: { friday: "2026-10-23", closed: true }, previous: { friday: "2026-10-16" } });
  });

  it("counts only the window's donations, never the all-time total", () => {
    const p = buildDressDown([cans(1, 40, "2026-10-06T13:00:00Z"), cans(1, 3, "2026-10-13T13:00:00Z")], at("2026-10-14T16:00:00Z"));
    expect(p.current).toMatchObject({ friday: "2026-10-16", counted: 3, reached: false, closed: false });
    expect(p.previous).toMatchObject({ friday: "2026-10-09", counted: 40, reached: true, closed: true });
    expect(dressDownStatus(p.current!, p)).toBe("7 more to reach the target");
  });

  it("switches window at the cutoff: Thursday 11:59 p.m. Toronto", () => {
    // Thu Oct 15 23:59:30 and Fri Oct 16 00:00:00 in Toronto.
    const lastMinute = cans(1, 10, "2026-10-16T03:59:30Z");
    const afterCutoff = cans(1, 4, "2026-10-16T04:00:00Z");
    const open = buildDressDown([lastMinute, afterCutoff], at("2026-10-16T03:59:00Z"));
    expect(open.current).toMatchObject({ friday: "2026-10-16", counted: 10, reached: true, closed: false });
    const next = buildDressDown([lastMinute, afterCutoff], at("2026-10-16T04:00:00Z"));
    expect(next.current).toMatchObject({ friday: "2026-10-23", counted: 4 });
    expect(next.previous).toMatchObject({ friday: "2026-10-16", counted: 10, closed: true });
  });

  it("shows the real number over 10 and says 'Eligible' only on confirmed rules", () => {
    const p = buildDressDown([cans(1, 9, "2026-10-13T13:00:00Z"), cash(1, 550, "2026-10-13T13:00:00Z")], at("2026-10-14T16:00:00Z"));
    expect(p.current).toMatchObject({ counted: 14, reached: true });
    expect(p.confirmed).toBe(false);
    expect(dressDownStatus(p.current!, p)).toBe("Reached 10 by the cutoff");
    expect(dressDownStatus(p.current!, { ...p, confirmed: true })).toBe("Eligible");
    // Every placeholder must be confirmed, not just one.
    const half = { ...DRESS_DOWN, cutoff: { ...DRESS_DOWN.cutoff, confirmed: true } };
    expect(buildDressDown([], at("2026-10-14T16:00:00Z"), half).confirmed).toBe(false);
  });
});

describe("homeroom dodgeball progress", () => {
  const students = [st(1, "Ana", "Quill", 9, "9A"), st(2, "Ben", "Stone", 9, "9A"), st(3, "Cy", "West", 9, "9B")];

  it("targets class size × 10 and counts this drive only", () => {
    const index = buildIndex(students, [cans(1, 12), cash(2, 350), cans(2, 30, "2025-10-14T13:00:00Z")], NOW);
    const h = buildHomeroomProgress(index, "9A");
    expect(h).toMatchObject({ classSize: 2, target: 20, total: 15, status: "below", place: null });
    expect(homeroomStatus(h)).toBe("5 more to reach the class target");
    // All-time still counts last year's cans.
    expect(buildStudentProfile(index, "2", seal)!.allTime.total).toBe(33);
  });

  it("stops at 'target reached' until a place is recorded", () => {
    const index = buildIndex(students, [cans(1, 25)], NOW);
    const reached = buildHomeroomProgress(index, "9A");
    expect(reached.status).toBe("reached");
    expect(homeroomStatus(reached)).toBe("Target reached · place not confirmed yet");
    expect(homeroomStatus(reached)).not.toMatch(/Qualified/);

    const confirmed = buildHomeroomProgress(index, "9A", new Map([["9A", 4]]));
    expect(confirmed).toMatchObject({ status: "confirmed", place: 4 });
    expect(homeroomStatus(confirmed)).toBe("Qualified · place 4 of 20 confirmed");
  });
});

describe("student search", () => {
  const find = (q: string) => searchStandings(mockIndex(), q, seal);

  it("matches partial names and flags students who share a name", () => {
    const r = find("ava mart");
    expect(r.items.map((i) => [i.firstName, i.lastName, i.homeroom, i.sameName])).toEqual([
      ["Ava", "Martin", "10C", true],
      ["Ava", "Martin", "11B", true],
      ["Ava", "Martinez", "12A", false],
    ]);
    expect(r.items[0]).toMatchObject({ total: 151, rank: 7 });
    expect(r.items[2]).toMatchObject({ total: null, rank: null });
  });

  it("ignores accents and apostrophes, and offers near spellings separately", () => {
    expect(find("zoe obrien").items.map((i) => i.lastName)).toEqual(["O’Brien"]);
    const near = find("maya reyez");
    expect(near.items).toHaveLength(1);
    expect(near.items[0]).toMatchObject({ firstName: "Maya", similar: true });
  });

  it("returns nothing for empty and one-letter queries", () => {
    expect(find("")).toEqual({ items: [], total: 0 });
    expect(find(" a ")).toEqual({ items: [], total: 0 });
  });

  it("caps the list at 8 and reports how many matched", () => {
    const students = Array.from({ length: 12 }, (_, i) => st(i + 1, "Sam", `Lee${i}`));
    const r = searchStandings(buildIndex(students, [], NOW), "sam", seal);
    expect(r.items).toHaveLength(8);
    expect(r.total).toBe(12);
  });

  it("lists names that start with the query before other matches", () => {
    const students = [st(1, "Ava", "Martin"), st(2, "Martin", "Zed")];
    const r = searchStandings(buildIndex(students, [], NOW), "mart", seal);
    expect(r.items.map((i) => i.firstName)).toEqual(["Martin", "Ava"]);
  });
});

describe("student profile", () => {
  it("reports totals, ranks and history, newest first", () => {
    const students = [st(1, "Ana", "Quill"), st(2, "Ben", "Stone"), st(3, "Ana", "Quill", 11, "11B")];
    const index = buildIndex(students, [cans(1, 4, EARLIER), cash(1, 250), cans(2, 9)], NOW);
    const p = buildStudentProfile(index, "1", seal)!;
    expect(p.student).toMatchObject({ ref: "ref-1", sameNameCount: 2 });
    expect(p.allTime).toMatchObject({ total: 6, cans: 4, cashCents: 250, rank: 2, donorCount: 2, inTop25: true, cutoffTotal: null });
    expect(p.today).toMatchObject({ total: 2, rank: 2, donorCount: 2 });
    expect(p.history).toEqual([
      { date: TODAY, method: "cash", cans: null, cashCents: 250 },
      { date: EARLIER, method: "cans", cans: 4, cashCents: null },
    ]);
    expect(buildStudentProfile(index, "3", seal)!.history).toEqual([]);
    expect(buildStudentProfile(index, "999", seal)).toBeNull();
  });

  it("sends no student ids, transaction ids or recorded_at", () => {
    const SECRET = "test-secret-that-is-long-enough-000000";
    const sealed = (id: string) => sealStudentRef(id, SECRET);
    const students = [st(987654, "Ana", "Quill"), st(876543, "Ben", "Stone")];
    const index = buildIndex(students, [cans(987654, 5), cans(876543, 6)], NOW);
    const json = JSON.stringify([
      buildStandingsData(index, sealed),
      searchStandings(index, "ana", sealed),
      buildStudentProfile(index, "987654", sealed),
    ]);
    expect(json).not.toMatch(/987654|876543|student_id|studentId|"id"|transaction_id|recorded_at/);
  });
});

describe("mock data", () => {
  it("has the cases the page is designed around", () => {
    const d = buildStandingsData(mockIndex(), seal);
    expect(d.today.entries[0]).toMatchObject({ firstName: "Maya", lastName: "Reyes", total: 46, cans: 36, cashCents: 1000, allTimeRank: 29 });
    expect(d.today.donorCount).toBe(11);
    expect(d.allTime.rows).toHaveLength(25);
    expect(d.allTime.rows.filter((r) => r.tied).map((r) => r.rank)).toEqual([7, 7]);
    expect(d.allTime.rows[24].total).toBe(75);
    expect(buildHomeroomProgress(mockIndex(), "11A")).toMatchObject({ classSize: 28, target: 280, total: 235 });
    expect(buildStandingsData(mockIndex("tie"), seal).today.entries.slice(1, 4).map((e) => [e.rank, e.total])).toEqual([
      [2, 34],
      [2, 34],
      [2, 34],
    ]);
  });
});
