import type { Grade, GradeDayTotal } from "./types";

export type Rank = 1 | 2 | 3 | 4;

export interface RankedGrade {
  grade: Grade;
  cans: number;
  cashCents: number;
  /** Can-equivalents. */
  total: number;
  rank: Rank;
  /** Another grade has the same total (and so the same rank). */
  tied: boolean;
  /** Rounded percentage of the day total; 0 on an empty day. */
  share: number;
}

/**
 * Ranks by each grade's `total` (rounded per student, then summed), never by
 * re-rounding its summed cans + cash, so the ranking and the shown totals agree.
 *
 * Competition ranking ("1224"): equal totals share a rank and the next rank is
 * skipped. Equal totals are listed by grade ascending, for display order only;
 * there is deliberately no tiebreaker.
 */
export function rankDay(totals: GradeDayTotal[]): {
  ranked: RankedGrade[];
  dayTotal: number;
  isEmpty: boolean;
} {
  const withTotals = totals
    .map((t) => ({ grade: t.grade, cans: t.cans, cashCents: t.cashCents, total: t.total }))
    .sort((a, b) => b.total - a.total || a.grade - b.grade);
  const dayTotal = withTotals.reduce((sum, t) => sum + t.total, 0);

  const ranked = withTotals.map((t, i) => {
    const firstEqual = withTotals.findIndex((o) => o.total === t.total);
    return {
      ...t,
      rank: (firstEqual + 1) as Rank,
      tied: withTotals.some((o, j) => j !== i && o.total === t.total),
      share: dayTotal === 0 ? 0 : Math.round((t.total / dayTotal) * 100),
    };
  });

  return { ranked, dayTotal, isEmpty: dayTotal === 0 };
}
