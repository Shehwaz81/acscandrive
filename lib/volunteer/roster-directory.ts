import type { StudentDirectory } from "./repository";
import type { Student, StudentSearchResult } from "./types";

/** The real roster, via the workspace's route handlers (app/api/volunteer/students). */
export class RosterDirectory implements StudentDirectory {
  async search(query: string): Promise<StudentSearchResult> {
    const res = await fetch(`/api/volunteer/students?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Student search failed (${res.status})`);
    return (await res.json()) as StudentSearchResult;
  }

  async get(id: string): Promise<Student | null> {
    const res = await fetch(`/api/volunteer/students/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Student lookup failed (${res.status})`);
    return (await res.json()) as Student;
  }
}
