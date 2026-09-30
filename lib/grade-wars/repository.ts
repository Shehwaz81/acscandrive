import type { CollectionDay, GradeDayResult } from "./types";

/** The seam between the Grade Wars UI and wherever the numbers come from. */
export interface GradeWarsRepository {
  /** Ascending by date. */
  listCollectionDays(): Promise<CollectionDay[]>;
  getDayResult(dayId: string): Promise<GradeDayResult>;
}
