import { HttpStandingsRepository } from "./http-repository";
import type { StandingsRepository } from "./repository";

/** The real `students` and `donation_logs` tables, through the route handlers under app/api/standings. */
export function createStandingsRepository(): StandingsRepository {
  return new HttpStandingsRepository();
}
