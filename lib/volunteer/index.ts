import { MockVolunteerRepository } from "./mock-repository";
import type { MockControls, VolunteerRepository } from "./repository";
import { SupabaseVolunteerRepository } from "./supabase-repository";

export type DataSource = "mock" | "supabase";

/**
 * mock:     fictional seed students and seeded logs, all in memory.
 * supabase: the real `students` and `donation_logs` tables, through the
 *           workspace's route handlers.
 */
export const DATA_SOURCE: DataSource =
  process.env.NEXT_PUBLIC_VOLUNTEER_DATA_SOURCE === "supabase" ? "supabase" : "mock";

export function createRepository(
  source: DataSource = DATA_SOURCE,
): { repo: VolunteerRepository; mock: MockControls | null } {
  if (source === "supabase") return { repo: new SupabaseVolunteerRepository(), mock: null };
  const mock = new MockVolunteerRepository();
  return { repo: mock, mock };
}
