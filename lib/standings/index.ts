import { HttpStandingsRepository } from "./http-repository";
import { type MockScenario, MockStandingsRepository } from "./mock-repository";
import type { StandingsRepository } from "./repository";

export type DataSource = "mock" | "supabase";

/**
 * mock:     fictional students and logs, all in memory (the default).
 * supabase: the real `students` and `donation_logs` tables, through
 *           `standings.server.ts` and the route handlers under app/api/standings.
 *
 * Flipping this to `supabase` publishes full names and donation histories, so
 * it stays `mock` until the owner has checked the privacy items in
 * docs/architecture.md (Student Standings).
 */
export const DATA_SOURCE: DataSource =
  process.env.NEXT_PUBLIC_STANDINGS_DATA_SOURCE === "supabase" ? "supabase" : "mock";

export function createStandingsRepository(
  source: DataSource = DATA_SOURCE,
  scenario: MockScenario = "live",
): StandingsRepository {
  return source === "supabase" ? new HttpStandingsRepository() : new MockStandingsRepository(scenario);
}
