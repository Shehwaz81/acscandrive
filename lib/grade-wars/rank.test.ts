import { describe, expect, it } from "vitest";
import { rankDay } from "./rank";
import type { Grade, GradeDayTotal } from "./types";

/** Totals given as can-equivalents, all in cans. */
const day = (t9: number, t10: number, t11: number, t12: number): GradeDayTotal[] =>
  [t9, t10, t11, t12].map((cans, i) => ({ grade: (9 + i) as Grade, cans, cashCents: 0, total: cans }));

const summary = (totals: GradeDayTotal[]) =>
  rankDay(totals).ranked.map((r) => [r.grade, r.rank, r.tied]);

describe("rankDay", () => {
  it("ranks a normal day by total, descending", () => {
    expect(summary(day(180, 215, 260, 295))).toEqual([
      [12, 1, false],
      [11, 2, false],
      [10, 3, false],
      [9, 4, false],
    ]);
  });

  it("shares 1st on a two-way tie and skips 2nd", () => {
    expect(summary(day(305, 240, 305, 270))).toEqual([
      [9, 1, true],
      [11, 1, true],
      [12, 3, false],
      [10, 4, false],
    ]);
  });

  it("shares 2nd on a tie below the leader (1, 2, 2, 4)", () => {
    expect(summary(day(100, 200, 200, 300))).toEqual([
      [12, 1, false],
      [10, 2, true],
      [11, 2, true],
      [9, 4, false],
    ]);
  });

  it("marks an all-zero day empty with no shares", () => {
    const r = rankDay(day(0, 0, 0, 0));
    expect(r.isEmpty).toBe(true);
    expect(r.dayTotal).toBe(0);
    expect(r.ranked.map((g) => g.grade)).toEqual([9, 10, 11, 12]);
    expect(r.ranked.every((g) => g.share === 0)).toBe(true);
  });

  it("ranks by the per-student total, not by re-rounding summed cash", () => {
    // Grade 9: two students gave $0.50 each → 0 + 0 = 0, though the grade's cash is $1.00.
    const r = rankDay([
      { grade: 9, cans: 0, cashCents: 100, total: 0 },
      { grade: 10, cans: 0, cashCents: 0, total: 0 },
      { grade: 11, cans: 0, cashCents: 0, total: 0 },
      { grade: 12, cans: 0, cashCents: 0, total: 0 },
    ]);
    expect(r.isEmpty).toBe(true);
    expect(r.ranked.every((g) => g.rank === 1 && g.total === 0)).toBe(true);
  });

  it("ranks a day with cans and cash", () => {
    const r = rankDay([
      { grade: 9, cans: 290, cashCents: 7_500, total: 365 },
      { grade: 10, cans: 197, cashCents: 4_800, total: 245 },
      { grade: 11, cans: 318, cashCents: 10_200, total: 420 },
      { grade: 12, cans: 226, cashCents: 8_400, total: 310 },
    ]);
    expect(r.dayTotal).toBe(1_340);
    expect(r.isEmpty).toBe(false);
    expect(r.ranked.map((g) => [g.grade, g.rank, g.total, g.share])).toEqual([
      [11, 1, 420, 31],
      [9, 2, 365, 27],
      [12, 3, 310, 23],
      [10, 4, 245, 18],
    ]);
  });
});
