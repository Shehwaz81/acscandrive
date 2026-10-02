import type { SearchResult, StudentProfile, StudentRef } from "./types";

/**
 * The seam between the standings UI and wherever students come from. The
 * podium and table arrive with the page; search and profiles are on demand,
 * so the roster and histories are never in the page payload.
 */
export interface StandingsRepository {
  searchStudents(query: string): Promise<SearchResult>;
  /** Rejects with StudentNotFoundError for an unknown or altered ref. */
  getStudentProfile(ref: StudentRef): Promise<StudentProfile>;
}

export class StudentNotFoundError extends Error {
  constructor() {
    super("Student not found");
    this.name = "StudentNotFoundError";
  }
}
