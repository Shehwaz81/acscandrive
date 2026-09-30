import type {
  DonationLog,
  LogPatch,
  LogWithStudent,
  NewLog,
  Student,
  StudentSearchResult,
  StudentTotals,
} from "./types";

/** The seam between the workspace UI and storage. */
export interface VolunteerRepository {
  searchStudents(query: string): Promise<StudentSearchResult>;
  getStudent(id: string): Promise<Student | null>;
  /** Newest first. */
  listLogsForStudent(studentId: string): Promise<DonationLog[]>;
  /** Newest first, across all students. */
  listRecentLogs(limit: number): Promise<LogWithStudent[]>;
  getTotals(studentId: string): Promise<StudentTotals>;
  /**
   * Idempotent on `input.id`: repeating a create with the same id and payload
   * returns the original log; the same id with a different payload throws
   * `SubmissionConflictError`.
   */
  createLog(input: NewLog): Promise<DonationLog>;
  /** Direct overwrite of method and amount; no history is kept. */
  updateLog(id: string, patch: LogPatch): Promise<DonationLog>;
  /** Real delete, no history. Deleting a log that is already gone succeeds, so a retry is safe. */
  deleteLog(id: string): Promise<void>;
}

/**
 * Where students come from, separate from where logs are kept, so the real
 * roster can be searched while logs are still held in memory.
 */
export interface StudentDirectory {
  search(query: string): Promise<StudentSearchResult>;
  get(id: string): Promise<Student | null>;
}

/** Test/prototype hooks, only offered by the mock. */
export interface MockControls {
  /** While on, the next write fails (and records nothing), then turns off. */
  setFailNextWrite(on: boolean): void;
  getFailNextWrite(): boolean;
  reset(): void;
}

export class SubmissionConflictError extends Error {
  constructor() {
    super("This submission id was already used for a different donation.");
    this.name = "SubmissionConflictError";
  }
}
