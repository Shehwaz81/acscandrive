/**
 * Everything the public Student Standings page (`/students`) may show. These
 * shapes reach the browser, so adding a field is a publishing decision.
 *
 * Owner's decision (2026-10-02): this page shows full names and lets anyone
 * look up a student's totals, reward progress and donation history (date,
 * method, amount). Still never sent: student ids (students are named by sealed
 * refs), transaction ids, `recorded_at`, anything about volunteers or admins.
 */

import type { Grade } from "../volunteer/types";

/** A sealed student id (`lib/standings/ref.ts`); opaque to the browser. */
export type StudentRef = string;

export type PublicStudent = {
  ref: StudentRef;
  firstName: string;
  lastName: string;
  /** Null for staff (homeroom "Teachers"). */
  grade: Grade | null;
  homeroom: string;
  /** Homeroom teacher label, as on the homepage. */
  teacher: string;
};

export type RankedStudent = PublicStudent & {
  /** Can-equivalents ($1 = 1 can, rounded down for this student). */
  total: number;
  /** Physical cans and cash behind `total`. */
  cans: number;
  cashCents: number;
  /** Competition rank: equal totals share a rank and the next is skipped. */
  rank: number;
  tied: boolean;
};

/** `total`, `cans` and `cashCents` are today's only. */
export type TodayEntry = RankedStudent & {
  /** Where this student stands all-time; drives the "not in the top 25, yet" note. */
  allTimeRank: number | null;
};

export type StandingsData = {
  /** ISO instant the figures were computed; shown as "Updated 11:42 am". */
  generatedAt: string;
  /** Students on the roster, for "Searches all N students". */
  rosterCount: number;
  today: {
    /** Toronto calendar date, "2026-10-23". */
    date: string;
    /** The top of today's ranking: three for the shelf, up to four close behind. */
    entries: TodayEntry[];
    donorCount: number;
  };
  allTime: {
    /** Ranks 1–25, including everyone tied at the last rank shown. Never padded. */
    rows: RankedStudent[];
    donorCount: number;
  };
};

export type SearchItem = PublicStudent & {
  /** All-time can-equivalents; null when nothing is recorded. */
  total: number | null;
  rank: number | null;
  /** Another student on the roster has the same full name. */
  sameName: boolean;
  /** A near spelling rather than a match; listed under "Similar spelling". */
  similar: boolean;
};

export type SearchResult = {
  /** At most SEARCH_LIMIT. */
  items: SearchItem[];
  /** How many students matched before the cap. */
  total: number;
};

export type DressDownWindow = {
  /** The dress-down Friday, "2026-10-23". */
  friday: string;
  /** First and last Toronto days that count toward it. */
  windowStart: string;
  windowEnd: string;
  /** Toronto wall-clock time on `windowEnd`, "23:59". */
  cutoff: string;
  /** This student's can-equivalents inside the window; never capped. */
  counted: number;
  reached: boolean;
  /** The cutoff has passed, so `counted` can no longer change. */
  closed: boolean;
};

export type DressDownProgress = {
  /** False while the windows, cutoff or carryover are placeholders: say "provisional", never "eligible". */
  confirmed: boolean;
  threshold: number;
  carryover: boolean;
  carryoverConfirmed: boolean;
  /** "ended": the last cutoff has passed and `current` is that last Friday's result. */
  phase: "before" | "open" | "ended";
  /** Null only if the drive contains no Friday. */
  current: DressDownWindow | null;
  previous: DressDownWindow | null;
};

export type HomeroomProgress = {
  homeroom: string;
  teacher: string;
  classSize: number;
  /** classSize × 10. */
  target: number;
  /** Sum of each student's can-equivalents inside the drive dates. */
  total: number;
  /**
   * "confirmed" only with a recorded place. Reaching the target is not a
   * place, and a place is never worked out from totals.
   */
  status: "below" | "reached" | "confirmed";
  place: number | null;
  maxPlaces: number;
  drive: { label: string; startDate: string; endDate: string };
};

export type HistoryEntry = {
  /** ISO `occurred_at`. */
  date: string;
  method: "cans" | "cash";
  cans: number | null;
  cashCents: number | null;
};

export type StudentProfile = {
  student: PublicStudent & { sameNameCount: number };
  allTime: {
    total: number;
    cans: number;
    cashCents: number;
    rank: number | null;
    tied: boolean;
    donorCount: number;
    inTop25: boolean;
    /** The lowest total on the top-25 table; null with fewer than 25 donors. */
    cutoffTotal: number | null;
  };
  today: {
    date: string;
    total: number;
    cans: number;
    cashCents: number;
    rank: number | null;
    tied: boolean;
    donorCount: number;
  };
  dressDown: DressDownProgress;
  homeroom: HomeroomProgress;
  /** Newest first. */
  history: HistoryEntry[];
};
