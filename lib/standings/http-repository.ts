import { type StandingsRepository, StudentNotFoundError } from "./repository";
import type { SearchResult, StudentProfile, StudentRef } from "./types";

/** The real roster and logs, through the public route handlers under app/api/standings. */
export class HttpStandingsRepository implements StandingsRepository {
  async searchStudents(query: string): Promise<SearchResult> {
    const res = await fetch(`/api/standings/students?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Student search failed (${res.status})`);
    return (await res.json()) as SearchResult;
  }

  async getStudentProfile(ref: StudentRef): Promise<StudentProfile> {
    const res = await fetch(`/api/standings/students/${encodeURIComponent(ref)}`, { cache: "no-store" });
    if (res.status === 404) throw new StudentNotFoundError();
    if (!res.ok) throw new Error(`Student lookup failed (${res.status})`);
    return (await res.json()) as StudentProfile;
  }
}
