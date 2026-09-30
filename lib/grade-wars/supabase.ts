import type { GradeWarsRepository } from "./repository";
import type { CollectionDay, GradeDayResult } from "./types";

/**
 * Not implemented yet. Likely shape:
 *
 * - `collection_days` table: `id`/`date` (date, the America/Toronto calendar
 *   day), plus whatever marks a day final (or derive "in_progress" as
 *   date = today in Toronto).
 * - `grade_day_totals` view: `donation_logs` joined to `students`, grouped by
 *   Toronto day of `occurred_at` and `students.grade`, returning `cans` and
 *   `cash_cents` sums (cans and cash only; `online` stays out until refunds are
 *   defined). Zero-fill missing grades so every day has four rows.
 *   Can-equivalents stay in TypeScript (`toCanEquivalents`), and follow the
 *   homepage's rule: round down per student, then sum.
 *
 * `students` and `donation_logs` are server-only (RLS on, no policies), so the
 * browser cannot query them. This class should call a public route handler
 * (e.g. `GET /api/grade-wars/days`, `GET /api/grade-wars/days/[id]`) that reads
 * with the admin client and returns only these per-grade aggregates.
 * Privacy: a grade with a single donor that day would reveal that student's
 * amount; decide whether that is acceptable before going live.
 */
export class SupabaseGradeWarsRepository implements GradeWarsRepository {
  async listCollectionDays(): Promise<CollectionDay[]> {
    throw new Error("Not implemented");
  }

  async getDayResult(dayId: string): Promise<GradeDayResult> {
    void dayId;
    throw new Error("Not implemented");
  }
}
