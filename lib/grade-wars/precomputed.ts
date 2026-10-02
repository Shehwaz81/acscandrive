import type { GradeWarsRepository } from "./repository";
import type { CollectionDay, GradeDayResult, GradeWarsData } from "./types";

/**
 * Serves the figures `buildGradeWars()` computed on the server, which reach
 * the browser as a page prop. No network: both methods resolve from memory.
 */
export class PrecomputedGradeWarsRepository implements GradeWarsRepository {
  private readonly data: GradeWarsData;

  constructor(data: GradeWarsData) {
    this.data = data;
  }

  async listCollectionDays(): Promise<CollectionDay[]> {
    return this.data.days;
  }

  async getDayResult(dayId: string): Promise<GradeDayResult> {
    const result = this.data.results.find((r) => r.day.id === dayId);
    if (!result) throw new Error(`Unknown collection day: ${dayId}`);
    return result;
  }
}
