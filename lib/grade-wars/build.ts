import type { LogRow } from "../homepage";
import { DRIVE } from "../site";
import { canEquivalents } from "../volunteer/money";
import { torontoClock, torontoDayKey } from "../volunteer/time";
import type { Student } from "../volunteer/types";
import { GRADES, type CollectionDay, type Grade, type GradeDayTotal, type GradeWarsData } from "./types";

/** The date panel fits five days. */
const SHOWN_DAYS = 5;
const DAY_MS = 86_400_000;

/**
 * Grade Wars from the homepage's rows; no I/O.
 *
 * Days: every weekday from the drive's start through today (or the end date
 * once the drive is over), including days with no logs, last five only.
 * Today is in progress until the daily cutoff in Toronto, then final.
 *
 * Totals: logs grouped by the Toronto day of `occurred_at` and the student's
 * roster grade. Rounding follows the homepage: each student's day rounds
 * down, then grades sum. Logs on other days (weekends, outside the drive,
 * older than the five shown) and students missing from the roster or outside
 * Grades 9–12 are skipped.
 */
export function buildGradeWars(students: Student[], logs: LogRow[], now: Date): GradeWarsData {
  const today = torontoDayKey(now);
  const last = today < DRIVE.endDate ? today : DRIVE.endDate;
  const dates: string[] = [];
  // Calendar dates at noon UTC: no DST, so adding a day never skips one.
  for (let t = Date.parse(`${DRIVE.startDate}T12:00Z`); t <= Date.parse(`${last}T12:00Z`); t += DAY_MS) {
    const d = new Date(t);
    const weekday = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (weekday !== 0 && weekday !== 6) dates.push(d.toISOString().slice(0, 10));
  }
  const days: CollectionDay[] = dates.slice(-SHOWN_DAYS).map((date) => ({
    id: date,
    date,
    status: date < today || torontoClock(now) >= DRIVE.dailyCutoff ? "final" : "in_progress",
  }));

  const gradeOf = new Map(students.filter((s) => GRADES.includes(s.grade)).map((s) => [s.id, s.grade]));
  const shown = new Set(days.map((d) => d.date));
  // "studentId|date" → that student's sums for the day.
  const perStudent = new Map<string, { date: string; grade: Grade; cans: number; cents: number }>();
  for (const l of logs) {
    const id = String(l.student_id);
    const grade = gradeOf.get(id);
    const date = torontoDayKey(l.occurred_at);
    if (!grade || !shown.has(date)) continue;
    const key = `${id}|${date}`;
    const s = perStudent.get(key) ?? { date, grade, cans: 0, cents: 0 };
    s.cans += l.can_count ?? 0;
    s.cents += l.amount_cents ?? 0;
    perStudent.set(key, s);
  }

  const totals = new Map(
    days.map((d) => [d.date, GRADES.map((grade): GradeDayTotal => ({ grade, cans: 0, cashCents: 0, total: 0 }))]),
  );
  for (const s of perStudent.values()) {
    const t = totals.get(s.date)![GRADES.indexOf(s.grade)];
    t.cans += s.cans;
    t.cashCents += s.cents;
    t.total += canEquivalents(s.cans, s.cents);
  }

  return { days, results: days.map((day) => ({ day, totals: totals.get(day.date)! })) };
}
