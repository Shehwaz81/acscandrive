import { canEquivalents } from "./money";
import { SubmissionConflictError, type MockControls, type VolunteerRepository } from "./repository";
import { searchStudents } from "./search";
import { seedLogs, seedStudents } from "./seed";
import type { Amount, DonationLog, LogPatch, NewLog, Student } from "./types";

type Range = [min: number, max: number];

type Options = {
  /**
   * Simulated round-trips in ms. Writes take 600–900 ms so saving states are
   * visible; reads are closer to a real Supabase query so typing stays quick.
   * Tests pass zeros.
   */
  latency?: { read: Range; write: Range };
  now?: () => Date;
};

/** Mirrors the database's amount_matches_method check constraint. */
function assertValidAmount(a: Amount) {
  const n = a.method === "cans" ? a.cans : a.cashCents;
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${a.method} amount: ${n}`);
}

function amountFields(a: Amount): Pick<DonationLog, "method" | "cans" | "cashCents"> {
  return a.method === "cans"
    ? { method: "cans", cans: a.cans, cashCents: null }
    : { method: "cash", cans: null, cashCents: a.cashCents };
}

const byNewest = (a: DonationLog, b: DonationLog) => b.createdAt.localeCompare(a.createdAt);

/**
 * In-memory repository for building the UI before the backend exists. State
 * lives in this browser tab and resets on reload.
 */
export class MockVolunteerRepository implements VolunteerRepository, MockControls {
  private students: Student[] = [];
  private logs = new Map<string, DonationLog>();
  private failNext = false;
  private readonly latency: { read: Range; write: Range };
  private readonly now: () => Date;

  constructor(options: Options = {}) {
    this.latency = options.latency ?? { read: [150, 300], write: [600, 900] };
    this.now = options.now ?? (() => new Date());
    this.reset();
  }

  reset() {
    this.students = seedStudents();
    this.logs = new Map(seedLogs(this.students, this.now()).map((l) => [l.id, l]));
    this.failNext = false;
  }

  setFailNextWrite(on: boolean) {
    this.failNext = on;
  }

  getFailNextWrite() {
    return this.failNext;
  }

  private async delay(kind: "read" | "write" = "read") {
    const [min, max] = this.latency[kind];
    const ms = min + Math.random() * (max - min);
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }

  /** Simulates a dropped connection: throws before anything is written. */
  private maybeFail() {
    if (!this.failNext) return;
    this.failNext = false;
    throw new Error("The connection dropped.");
  }

  async searchStudents(query: string) {
    await this.delay();
    return structuredClone(searchStudents(this.students, query));
  }

  async getStudent(id: string) {
    await this.delay();
    const s = this.students.find((s) => s.id === id);
    return s ? { ...s } : null;
  }

  async listLogsForStudent(studentId: string) {
    await this.delay();
    return [...this.logs.values()]
      .filter((l) => l.studentId === studentId)
      .sort(byNewest)
      .map((l) => ({ ...l }));
  }

  async listRecentLogs(limit: number) {
    await this.delay();
    return [...this.logs.values()]
      .sort(byNewest)
      .slice(0, limit)
      .map((l) => ({ ...l, student: { ...this.students.find((s) => s.id === l.studentId)! } }));
  }

  async getTotals(studentId: string) {
    await this.delay();
    let cans = 0;
    let cashCents = 0;
    for (const l of this.logs.values()) {
      if (l.studentId !== studentId) continue;
      cans += l.cans ?? 0;
      cashCents += l.cashCents ?? 0;
    }
    return { cans, cashCents, canEquivalents: canEquivalents(cans, cashCents) };
  }

  async createLog(input: NewLog) {
    await this.delay("write");
    this.maybeFail();
    assertValidAmount(input);
    const fields = amountFields(input);

    // Same submission id: a retry. Return the original, or reject a changed payload.
    const existing = this.logs.get(input.id);
    if (existing) {
      const same =
        existing.studentId === input.studentId &&
        existing.method === fields.method &&
        existing.cans === fields.cans &&
        existing.cashCents === fields.cashCents;
      if (!same) throw new SubmissionConflictError();
      return { ...existing };
    }

    if (!this.students.some((s) => s.id === input.studentId)) {
      throw new Error(`Unknown student ${input.studentId}`);
    }
    const at = this.now().toISOString();
    const log: DonationLog = {
      id: input.id,
      studentId: input.studentId,
      ...fields,
      createdAt: at,
      updatedAt: at,
    };
    this.logs.set(log.id, log);
    return { ...log };
  }

  async updateLog(id: string, patch: LogPatch) {
    await this.delay("write");
    this.maybeFail();
    assertValidAmount(patch);
    const existing = this.logs.get(id);
    if (!existing) throw new Error(`Unknown log ${id}`);
    const updated: DonationLog = {
      ...existing,
      ...amountFields(patch),
      updatedAt: this.now().toISOString(),
    };
    this.logs.set(id, updated);
    return { ...updated };
  }
}
