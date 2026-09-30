/**
 * Homepage figures: shared types, display helpers and the pure aggregation
 * that turns private rows into the public numbers. No I/O here, so client
 * components can import the helpers and tests can feed synthetic rows.
 */

import { canEquivalents, formatCents } from "./volunteer/money";
import { isTodayToronto } from "./volunteer/time";
import type { Student } from "./volunteer/types";

export type Homeroom = {
  room: string;
  /** Grades of the students in it; many homerooms mix grades. Ascending. */
  grades: number[];
  students: number;
  /** Can-equivalents: the sum of each student's total ($1 = 1 can). */
  total: number;
  /** Physical cans and cash, for the split line. */
  cans: number;
  cashCents: number;
};

/** A top donor as shown publicly: "First L.", homeroom and today's can-equivalents. */
export type Donor = { name: string; room: string; cans: number };

export type HomepageData = {
  /** School goal in can-equivalents. */
  goal: number;
  /** School total in can-equivalents. */
  total: number;
  /** Sorted by total, descending. */
  homerooms: Homeroom[];
  /** Today's top donors, in rank order. */
  topDonors: Donor[];
};

/** The columns the aggregation needs from a `donation_logs` row. */
export type LogRow = {
  student_id: number;
  can_count: number | null;
  amount_cents: number | null;
  occurred_at: string;
};

const TOP_DONORS = 8;

/**
 * Rounding rule: each student's total is canEquivalents(their cans, their
 * cents), so partial dollars round down per student. A homeroom's total is
 * the sum of its students' totals and the school total is the sum of the
 * homerooms, so every level agrees with the volunteer dashboard.
 */
export function buildHomepageData(
  students: Student[],
  logs: LogRow[],
  goal: number,
  now: Date = new Date(),
): HomepageData {
  const allTime = new Map<string, { cans: number; cents: number }>();
  const today = new Map<string, { cans: number; cents: number }>();
  const add = (m: typeof allTime, id: string, l: LogRow) => {
    const s = m.get(id) ?? { cans: 0, cents: 0 };
    s.cans += l.can_count ?? 0;
    s.cents += l.amount_cents ?? 0;
    m.set(id, s);
  };
  for (const l of logs) {
    const id = String(l.student_id);
    add(allTime, id, l);
    if (isTodayToronto(l.occurred_at, now)) add(today, id, l);
  }

  const rooms = new Map<string, Homeroom & { gradeSet: Set<number> }>();
  const donors: (Donor & { lastName: string })[] = [];
  for (const st of students) {
    const r = rooms.get(st.homeroom) ?? {
      room: st.homeroom,
      grades: [],
      gradeSet: new Set<number>(),
      students: 0,
      total: 0,
      cans: 0,
      cashCents: 0,
    };
    r.gradeSet.add(st.grade);
    r.students += 1;
    const a = allTime.get(st.id);
    if (a) {
      r.total += canEquivalents(a.cans, a.cents);
      r.cans += a.cans;
      r.cashCents += a.cents;
    }
    rooms.set(st.homeroom, r);

    const t = today.get(st.id);
    const todayTotal = t ? canEquivalents(t.cans, t.cents) : 0;
    if (todayTotal > 0) {
      donors.push({ name: publicName(st), room: st.homeroom, cans: todayTotal, lastName: st.lastName });
    }
  }

  const homerooms = [...rooms.values()]
    .map(({ gradeSet, ...h }) => ({ ...h, grades: [...gradeSet].sort((a, b) => a - b) }))
    .sort((a, b) => b.total - a.total || byRoom(a.room, b.room));

  const topDonors = donors
    .sort((a, b) => b.cans - a.cans || a.name.localeCompare(b.name) || a.lastName.localeCompare(b.lastName))
    .slice(0, TOP_DONORS)
    .map((d) => ({ name: d.name, room: d.room, cans: d.cans }));

  return { goal, total: homerooms.reduce((sum, h) => sum + h.total, 0), homerooms, topDonors };
}

/** Owner's decision: first name + last initial, e.g. "Maya R.". */
export function publicName(s: Pick<Student, "firstName" | "lastName">): string {
  const initial = s.lastName.trim().charAt(0).toUpperCase();
  return initial ? `${s.firstName.trim()} ${initial}.` : s.firstName.trim();
}

/** "9" before "10" before "P1" before "UW". */
const byRoom = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });

// --- Display helpers ---------------------------------------------------------

export const fmt = (n: number) => n.toLocaleString("en-CA");

export const ordinalSuffix = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return "th";
  return n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
};

/** "Grade 9" or "Grades 10, 11, 12". */
export const gradeLabel = (h: Pick<Homeroom, "grades">) =>
  h.grades.length === 1 ? `Grade ${h.grades[0]}` : `Grades ${h.grades.join(", ")}`;

/** Provisional dodgeball target: class size × 10 (unconfirmed rule). */
export function homeroomStats(h: Homeroom) {
  const target = h.students * 10;
  const pct = Math.min(100, Math.round((h.total / target) * 100));
  const toGo = Math.max(0, target - h.total);
  return {
    target,
    pct,
    split: `${fmt(h.cans)} cans + ${formatCents(h.cashCents)} cash`,
    status: toGo === 0 ? "Target hit ✓" : `${fmt(toGo)} to go`,
  };
}

/**
 * Standings search: "grade 9" or "g9" matches homerooms with grade 9
 * students, a bare 9–12 also matches a grade, anything else matches part of
 * the homeroom code.
 */
export function matchesQuery(h: Homeroom, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase().replace(/^grade\s*/, "g");
  if (!q) return true;
  if (/^g\d+$/.test(q)) return h.grades.includes(Number(q.slice(1)));
  return h.room.toLowerCase().includes(q) || h.grades.includes(Number(q));
}
