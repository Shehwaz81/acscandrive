import { MockVolunteerRepository } from "./mock-repository";
import type { MockControls, VolunteerRepository } from "./repository";
import { RosterDirectory } from "./roster-directory";

export type DataSource = "mock" | "supabase";

/**
 * mock:     fictional seed students and seeded logs, all in memory.
 * supabase: the real `students` table for search and lookup; logs are still
 *           kept in memory (nothing is written to donation_logs yet). The full
 *           SupabaseVolunteerRepository replaces this once logs are connected.
 */
export const DATA_SOURCE: DataSource =
  process.env.NEXT_PUBLIC_VOLUNTEER_DATA_SOURCE === "supabase" ? "supabase" : "mock";

export function createRepository(
  source: DataSource = DATA_SOURCE,
): { repo: VolunteerRepository; mock: MockControls | null } {
  const mock = new MockVolunteerRepository(
    source === "supabase" ? { directory: new RosterDirectory() } : {},
  );
  return { repo: mock, mock };
}
