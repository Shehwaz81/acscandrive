import { SubmissionConflictError, type VolunteerRepository } from "./repository";
import { RosterDirectory } from "./roster-directory";
import type { DonationLog, LogPatch, LogWithStudent, NewLog, StudentTotals } from "./types";

/**
 * The real backend, from the browser: every call goes to the workspace's
 * route handlers (app/api/volunteer/students and app/api/volunteer/logs),
 * which check the volunteer session and query Postgres with the server-only
 * admin client. The browser never talks to the database directly.
 */

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (res.status === 409) throw new SubmissionConflictError();
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

const q = encodeURIComponent;

export class SupabaseVolunteerRepository implements VolunteerRepository {
  private readonly roster = new RosterDirectory();

  searchStudents(query: string) {
    return this.roster.search(query);
  }

  getStudent(id: string) {
    return this.roster.get(id);
  }

  listLogsForStudent(studentId: string) {
    return send<DonationLog[]>(`/api/volunteer/logs?studentId=${q(studentId)}`);
  }

  listRecentLogs(limit: number) {
    return send<LogWithStudent[]>(`/api/volunteer/logs/recent?limit=${limit}`);
  }

  getTotals(studentId: string) {
    return send<StudentTotals>(`/api/volunteer/logs/totals?studentId=${q(studentId)}`);
  }

  createLog(input: NewLog) {
    return send<DonationLog>("/api/volunteer/logs", { method: "POST", body: JSON.stringify(input) });
  }

  updateLog(id: string, patch: LogPatch) {
    return send<DonationLog>(`/api/volunteer/logs/${q(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  }

  /** 204 has no body, so this skips `send`'s JSON parsing. */
  async deleteLog(id: string) {
    const res = await fetch(`/api/volunteer/logs/${q(id)}`, { method: "DELETE", cache: "no-store" });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
  }
}
