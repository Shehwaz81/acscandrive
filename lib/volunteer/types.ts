/**
 * Volunteer workspace data shapes. UI code depends only on these and on
 * `VolunteerRepository`; storage details (column names, bigint ids) stay in
 * the repository implementations.
 */

export type Method = "cans" | "cash";

export type Grade = 9 | 10 | 11 | 12;

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: Grade;
  homeroom: string;
}

export interface DonationLog {
  id: string;
  studentId: string;
  method: Method;
  /** Whole cans, ≥1, when method is "cans"; otherwise null. */
  cans: number | null;
  /** Integer cents, ≥1, when method is "cash"; otherwise null. */
  cashCents: number | null;
  /** ISO timestamp of the first save. */
  createdAt: string;
  /** ISO timestamp of the last edit (equal to createdAt if never edited). */
  updatedAt: string;
}

export type LogWithStudent = DonationLog & { student: Student };

export interface StudentSearchResult {
  exact: Student[];
  /** Near spellings, shown under "Similar spelling". */
  similar: Student[];
}

/** Derived from logs; never stored or edited. */
export interface StudentTotals {
  cans: number;
  cashCents: number;
  canEquivalents: number;
}

export type Amount = { method: "cans"; cans: number } | { method: "cash"; cashCents: number };

/**
 * `id` is a client-generated UUID created once per form fill and reused on
 * retry, so a save whose response was lost cannot be credited twice.
 */
export type NewLog = { id: string; studentId: string } & Amount;

export type LogPatch = Amount;
