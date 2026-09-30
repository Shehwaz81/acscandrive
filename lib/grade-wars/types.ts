/** Grade Wars: each collection day's ranking of Grades 9–12. */

export type Grade = 9 | 10 | 11 | 12;

export const GRADES: readonly Grade[] = [9, 10, 11, 12];

export type DayStatus = "final" | "in_progress";

export interface CollectionDay {
  /** e.g. "2026-10-23" */
  id: string;
  /** Calendar date (YYYY-MM-DD) in the school's zone, America/Toronto. Not an instant. */
  date: string;
  /** "in_progress" only ever for the current day. */
  status: DayStatus;
}

export interface GradeDayTotal {
  grade: Grade;
  /** Physical cans, integer ≥ 0. */
  cans: number;
  /** Integer cents ≥ 0. */
  cashCents: number;
  /**
   * Can-equivalents: each student's day rounded down ($1 = 1 can), then
   * summed. Not recomputable from cans + cashCents, which would round once.
   */
  total: number;
}

export interface GradeDayResult {
  day: CollectionDay;
  /** Always exactly four entries, one per grade (zeros when a grade gave nothing). */
  totals: GradeDayTotal[];
}

/** Everything Grade Wars shows, computed on the server by `buildGradeWars()`. */
export interface GradeWarsData {
  /** Ascending, at most five. Empty before the drive starts. */
  days: CollectionDay[];
  /** One per day, same order. */
  results: GradeDayResult[];
}
