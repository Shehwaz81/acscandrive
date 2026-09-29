// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionConflictError } from "@/lib/volunteer/repository";

const session = vi.hoisted(() => ({ user: null as string | null }));
vi.mock("@/lib/auth/session", () => ({ getVolunteer: async () => session.user }));

// Route tests don't reach a database: the query functions are stubs, the parsers are real.
const db = vi.hoisted(() => ({
  createLog: vi.fn(),
  updateLog: vi.fn(),
  listStudentLogs: vi.fn(async () => []),
  listRecentLogs: vi.fn(async () => []),
  getStudentTotals: vi.fn(async () => ({ cans: 0, cashCents: 0, canEquivalents: 0 })),
}));
vi.mock("@/lib/volunteer/logs.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/volunteer/logs.server")>()),
  ...db,
}));

const logs = await import("./route");
const recent = await import("./recent/route");
const totals = await import("./totals/route");
const one = await import("./[id]/route");

const ID = "4f7c2a8e-1b3d-4e5f-8a9b-0c1d2e3f4a5b";
const url = (path: string) => `http://localhost/api/volunteer/logs${path}`;
const json = (method: string, path: string, body: unknown) =>
  new NextRequest(url(path), { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const ctx = { params: Promise.resolve({ id: ID }) };

beforeEach(() => {
  session.user = "desk";
  vi.clearAllMocks();
});

describe("log routes", () => {
  it("return 401 without a session and never query", async () => {
    session.user = null;
    const responses = await Promise.all([
      logs.GET(new NextRequest(url("?studentId=7"))),
      logs.POST(json("POST", "", { id: ID, studentId: "7", method: "cans", cans: 5 })),
      recent.GET(new NextRequest(url("/recent"))),
      totals.GET(new NextRequest(url("/totals?studentId=7"))),
      one.PATCH(json("PATCH", `/${ID}`, { method: "cans", cans: 5 }), ctx),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    for (const fn of Object.values(db)) expect(fn).not.toHaveBeenCalled();
  });

  it("reject an invalid amount with 400 before touching the database", async () => {
    const created = await logs.POST(json("POST", "", { id: ID, studentId: "7", method: "cans", cans: 0 }));
    const patched = await one.PATCH(json("PATCH", `/${ID}`, { method: "cash", cashCents: 1.5 }), ctx);
    expect([created.status, patched.status]).toEqual([400, 400]);
    expect(db.createLog).not.toHaveBeenCalled();
    expect(db.updateLog).not.toHaveBeenCalled();
  });

  it("answer 409 when a submission id is reused for a different donation", async () => {
    db.createLog.mockRejectedValueOnce(new SubmissionConflictError());
    const res = await logs.POST(json("POST", "", { id: ID, studentId: "7", method: "cans", cans: 5 }));
    expect(res.status).toBe(409);
  });
});
