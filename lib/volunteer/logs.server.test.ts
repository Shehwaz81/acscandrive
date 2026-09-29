import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionConflictError } from "./repository";

// Fake admin client with one stored row, so every insert of its id hits the
// primary key (Postgres error 23505), as a retried save would.
const ID = "4f7c2a8e-1b3d-4e5f-8a9b-0c1d2e3f4a5b";
const stored = {
  transaction_id: ID,
  student_id: 7,
  method: "cans",
  can_count: 12,
  amount_cents: null,
  recorded_at: "2026-09-29T14:00:00+00:00",
};
const inserts: unknown[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        inserts.push(row);
        return {
          select: () => ({
            single: async () => ({ data: null, error: { code: "23505", message: "duplicate key" } }),
          }),
        };
      },
      select: () => ({
        eq: () => ({ single: async () => ({ data: stored, error: null }) }),
      }),
    }),
  }),
}));

const { createLog, parseNewLog } = await import("./logs.server");

beforeEach(() => {
  inserts.length = 0;
});

describe("createLog with a reused submission id", () => {
  it("returns the saved log when the retry carries the same payload", async () => {
    const log = await createLog({ id: ID, studentId: "7", method: "cans", cans: 12 });
    expect(log).toMatchObject({ id: ID, studentId: "7", method: "cans", cans: 12, cashCents: null });
    expect(inserts).toHaveLength(1);
  });

  it.each([
    { id: ID, studentId: "8", method: "cans", cans: 12 },
    { id: ID, studentId: "7", method: "cans", cans: 13 },
    { id: ID, studentId: "7", method: "cash", cashCents: 1200 },
  ] as const)("rejects a different payload: %o", async (input) => {
    await expect(createLog(input)).rejects.toBeInstanceOf(SubmissionConflictError);
  });
});

describe("parseNewLog", () => {
  const base = { id: ID, studentId: "7" };
  it.each([
    { ...base, method: "cans", cans: 0 },
    { ...base, method: "cans", cans: 1.5 },
    { ...base, method: "cans", cans: "12" },
    { ...base, method: "cans", cans: 1000 },
    { ...base, method: "cans", cans: 5, cashCents: 500 },
    { ...base, method: "cash", cashCents: -100 },
    { ...base, method: "cash", cashCents: 200_001 },
    { ...base, method: "online", cashCents: 500 },
    { ...base, id: "not-a-uuid", method: "cans", cans: 5 },
    { ...base, studentId: "7 or 1=1", method: "cans", cans: 5 },
  ])("rejects %o", (body) => {
    expect(parseNewLog(body)).toBeNull();
  });

  it("accepts cans and cash", () => {
    expect(parseNewLog({ ...base, method: "cans", cans: 5, cashCents: null })).toEqual({ ...base, method: "cans", cans: 5 });
    expect(parseNewLog({ ...base, method: "cash", cashCents: 525 })).toEqual({ ...base, method: "cash", cashCents: 525 });
  });
});
