/**
 * DEMO DATA ONLY — fictional figures copied from the homepage design.
 *
 * Every number the homepage shows comes from this file. When the database
 * exists, replace these constants with aggregate-only server queries that
 * return the same shapes; the components should not need to change.
 */

export const GOAL = 20_000;
export const TOTAL_COLLECTED = 12_480;

export type Homeroom = {
  room: string;
  grade: number;
  /** Can-equivalents: physical cans plus $1 = 1 can (provisional rule). */
  total: number;
  students: number;
};

// Sorted by total, descending. Rank is the position in this list.
export const HOMEROOMS: Homeroom[] = [
  { room: "12B", grade: 12, total: 612, students: 27 },
  { room: "10D", grade: 10, total: 574, students: 30 },
  { room: "11A", grade: 11, total: 540, students: 26 },
  { room: "9C", grade: 9, total: 498, students: 31 },
  { room: "12E", grade: 12, total: 463, students: 25 },
  { room: "10A", grade: 10, total: 431, students: 29 },
  { room: "11D", grade: 11, total: 402, students: 28 },
  { room: "9E", grade: 9, total: 377, students: 30 },
  { room: "12A", grade: 12, total: 351, students: 24 },
  { room: "11F", grade: 11, total: 322, students: 29 },
  { room: "10B", grade: 10, total: 296, students: 31 },
  { room: "9A", grade: 9, total: 281, students: 28 },
  { room: "10C", grade: 10, total: 244, students: 28 },
  { room: "11B", grade: 11, total: 219, students: 27 },
  { room: "9D", grade: 9, total: 186, students: 30 },
  { room: "12C", grade: 12, total: 158, students: 26 },
];

export type Donor = { name: string; room: string; cans: number };

/** Today's top donors, in rank order. Fictional names. */
export const TOP_DONORS: Donor[] = [
  { name: "Maya R.", room: "11A", cans: 46 },
  { name: "Theo B.", room: "9C", cans: 38 },
  { name: "Priya S.", room: "12B", cans: 35 },
  { name: "Lucas M.", room: "10D", cans: 31 },
  { name: "Hana K.", room: "12E", cans: 27 },
  { name: "Owen D.", room: "9E", cans: 24 },
  { name: "Sofia L.", room: "11D", cans: 22 },
  { name: "Ethan P.", room: "10A", cans: 20 },
];

export const ZONE_ROWS = ["A", "B", "C", "D"] as const;
export const ZONE_COLS = 5;
export const SCHOOL_ZONE = "C3";
export const TAKEN_ZONES = new Set(["A2", "A4", "B1", "B4", "C5", "D2", "D3"]);

// --- Helpers ---------------------------------------------------------------

export const fmt = (n: number) => n.toLocaleString("en-CA");

export const ordinalSuffix = (n: number) =>
  n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";

/** Provisional dodgeball target: class size × 10 (unconfirmed rule). */
export function homeroomStats(h: Homeroom) {
  const target = h.students * 10;
  const pct = Math.min(100, Math.round((h.total / target) * 100));
  const toGo = Math.max(0, target - h.total);
  // Demo only: pretend ~27% of each total arrived as cash.
  const cash = Math.round(h.total * 0.27);
  return {
    target,
    pct,
    split: `${fmt(h.total - cash)} cans + $${fmt(cash)} cash`,
    status: toGo === 0 ? "Target hit ✓" : `${fmt(toGo)} to go`,
  };
}

/**
 * Standings search: "grade 9" or "g9" matches a grade, a bare number matches
 * a grade, anything else matches part of the homeroom code.
 */
export function matchesQuery(h: Homeroom, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase().replace(/^grade\s*/, "g");
  if (!q) return true;
  if (/^g\d+$/.test(q)) return `g${h.grade}` === q;
  return h.room.toLowerCase().includes(q) || String(h.grade) === q;
}
