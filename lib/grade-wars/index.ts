import { MockGradeWarsRepository } from "./mock";
import type { GradeWarsRepository } from "./repository";
import { SupabaseGradeWarsRepository } from "./supabase";

export type GradeWarsDataSource = "mock" | "supabase";

/** mock (default): fictional demo days, in memory. supabase: not implemented yet. */
export const GRADE_WARS_DATA_SOURCE: GradeWarsDataSource =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "supabase" : "mock";

/** Demo figures must be labelled as such on the page. */
export const GRADE_WARS_IS_DEMO = GRADE_WARS_DATA_SOURCE === "mock";

export const gradeWarsRepository: GradeWarsRepository =
  GRADE_WARS_DATA_SOURCE === "supabase" ? new SupabaseGradeWarsRepository() : new MockGradeWarsRepository();
