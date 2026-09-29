import type { VolunteerRepository } from "./repository";
import type { LogPatch, NewLog } from "./types";

/**
 * Placeholder for the real backend. Each TODO describes the intended query
 * against the existing tables (see supabase/migrations). Column mapping:
 *   Student.id ↔ students.student_id (bigint, sent as string)
 *   Student.homeroom ↔ students.hr
 *   DonationLog.id ↔ donation_logs.transaction_id
 *   cans ↔ can_count, cashCents ↔ amount_cents
 *   createdAt ↔ recorded_at, updatedAt ↔ updated_at
 *
 * Access: every call must run as a signed-in user whose JWT carries the
 * volunteer role; RLS policies enforce this (a signed-in user without the role
 * sees nothing). Never use the service-role key from the browser.
 */

function notImplemented(method: string): never {
  throw new Error(`SupabaseVolunteerRepository.${method}: Not implemented`);
}

export class SupabaseVolunteerRepository implements VolunteerRepository {
  async searchStudents(query: string) {
    // TODO: RPC `search_students(q text)` that normalizes with unaccent/lower,
    // returns prefix matches as `exact`, and uses pg_trgm similarity()
    // (GIN trigram index on the name) for up to 4 `similar` rows, only when
    // length(q) >= 4. Sort by last_name, first_name, grade.
    void query;
    return notImplemented("searchStudents");
  }

  async getStudent(id: string) {
    // TODO: select student_id, first_name, last_name, grade, hr from students
    // where student_id = $1 (maybeSingle).
    void id;
    return notImplemented("getStudent");
  }

  async listLogsForStudent(studentId: string) {
    // TODO: select * from donation_logs where student_id = $1
    // order by recorded_at desc.
    void studentId;
    return notImplemented("listLogsForStudent");
  }

  async listRecentLogs(limit: number) {
    // TODO: select donation_logs.*, students(*) order by recorded_at desc limit $1.
    void limit;
    return notImplemented("listRecentLogs");
  }

  async getTotals(studentId: string) {
    // TODO: view `student_totals` (sum(can_count), sum(amount_cents)) filtered
    // by student_id; compute canEquivalents with lib/volunteer/money.ts so the
    // rounding rule lives in one place.
    void studentId;
    return notImplemented("getTotals");
  }

  async createLog(input: NewLog) {
    // TODO: insert with transaction_id = input.id. On unique violation (23505),
    // select the existing row: return it if student/method/amount match (a
    // retry), otherwise throw SubmissionConflictError. The table's
    // amount_matches_method constraint rejects invalid amounts.
    void input;
    return notImplemented("createLog");
  }

  async updateLog(id: string, patch: LogPatch) {
    // TODO: update donation_logs set method, can_count, amount_cents
    // where transaction_id = $1 returning *; the trigger sets updated_at.
    void id;
    void patch;
    return notImplemented("updateLog");
  }
}
