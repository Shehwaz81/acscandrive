import "server-only";
import { GOAL, HOMEROOMS, TOP_DONORS, TOTAL_COLLECTED, type Donor, type Homeroom } from "./demo-data";

export type HomepageData = {
  /** School goal in can-equivalents. */
  goal: number;
  /** School total in can-equivalents. */
  total: number;
  /** Sorted by total, descending. */
  homerooms: Homeroom[];
  /** Today's top donors, in rank order. */
  topDonors: Donor[];
};

/**
 * Everything the homepage shows, fetched once by `app/page.tsx`.
 *
 * Returns demo constants for now. When this reads Supabase, only this body
 * changes, and only aggregates may leave it (the result is passed to client
 * components, so it ends up in the browser):
 *
 * - `total`: canEquivalents(sum of can_count, sum of amount_cents) over all
 *   donation_logs (`lib/volunteer/money.ts`). Never a stored total.
 * - `homerooms`: the same sums grouped by students.homeroom, plus the
 *   homeroom's student count. No student rows.
 * - `topDonors`: today's (America/Toronto) top 8 students by the same sum,
 *   as display name + homeroom + total only. No IDs.
 */
export async function getHomepageData(): Promise<HomepageData> {
  return { goal: GOAL, total: TOTAL_COLLECTED, homerooms: HOMEROOMS, topDonors: TOP_DONORS };
}
