import type { GradeWarsRepository } from "./repository";
import type { CollectionDay, Grade, GradeDayResult, GradeDayTotal } from "./types";

type Row = [cans: number, dollars: number];

/** Fictional demo figures, Grades 9, 10, 11, 12. The UI labels them as demo data. */
const DEMO: { date: string; totals: [Row, Row, Row, Row] }[] = [
  { date: "2026-10-19", totals: [[140, 40], [170, 45], [200, 60], [215, 80]] },
  // Grades 9 and 11 tie at 305.
  { date: "2026-10-20", totals: [[240, 65], [190, 50], [225, 80], [205, 65]] },
  { date: "2026-10-21", totals: [[0, 0], [0, 0], [0, 0], [0, 0]] },
  { date: "2026-10-22", totals: [[195, 55], [250, 80], [220, 65], [200, 60]] },
  // Latest: 11 = 420, 9 = 365, 12 = 310, 10 = 245.
  { date: "2026-10-23", totals: [[290, 75], [197, 48], [318, 102], [226, 84]] },
];

/** Forced states for trying the UI: ?gw=loading | error | live. */
export type MockMode = "loading" | "error" | "live" | null;

/** Reads ?gw= in development only; production builds compile this to `null`. */
function modeFromUrl(): MockMode {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const gw = new URLSearchParams(window.location.search).get("gw");
  return gw === "loading" || gw === "error" || gw === "live" ? gw : null;
}

export class MockGradeWarsRepository implements GradeWarsRepository {
  private readonly delayMs: number;
  private readonly mode: () => MockMode;

  constructor(options: { delayMs?: number; mode?: MockMode } = {}) {
    this.delayMs = options.delayMs ?? 300;
    this.mode = options.mode !== undefined ? () => options.mode! : modeFromUrl;
  }

  async listCollectionDays(): Promise<CollectionDay[]> {
    await this.delay();
    return this.days();
  }

  async getDayResult(dayId: string): Promise<GradeDayResult> {
    const mode = this.mode();
    // Never settles, so the loading state can be inspected.
    if (mode === "loading") return new Promise(() => {});
    await this.delay();
    if (mode === "error") throw new Error("Demo: forced error (?gw=error)");
    const i = DEMO.findIndex((d) => d.date === dayId);
    if (i === -1) throw new Error(`Unknown collection day: ${dayId}`);
    const totals: GradeDayTotal[] = DEMO[i].totals.map(([cans, dollars], g) => ({
      grade: (9 + g) as Grade,
      cans,
      cashCents: dollars * 100,
    }));
    return { day: this.days()[i], totals };
  }

  private days(): CollectionDay[] {
    const live = this.mode() === "live";
    return DEMO.map((d, i) => ({
      id: d.date,
      date: d.date,
      status: live && i === DEMO.length - 1 ? "in_progress" : "final",
    }));
  }

  private delay() {
    return this.delayMs > 0 ? new Promise((r) => setTimeout(r, this.delayMs)) : Promise.resolve();
  }
}
