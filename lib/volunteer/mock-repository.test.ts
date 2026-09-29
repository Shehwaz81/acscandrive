import { describe, expect, it } from "vitest";
import { MockVolunteerRepository } from "./mock-repository";
import { SubmissionConflictError } from "./repository";

const make = () => new MockVolunteerRepository({ latency: { read: [0, 0], write: [0, 0] } });
const ID = "00000000-0000-4000-8000-000000000001";

describe("MockVolunteerRepository", () => {
  it("treats a repeated submission id as a retry, not a second donation", async () => {
    const repo = make();
    const before = await repo.getTotals("s18");
    const first = await repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 5 });
    const retry = await repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 5 });
    expect(retry).toEqual(first);
    expect((await repo.getTotals("s18")).cans).toBe(before.cans + 5);
  });

  it("rejects the same submission id with a different payload", async () => {
    const repo = make();
    await repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 5 });
    await expect(
      repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 6 }),
    ).rejects.toBeInstanceOf(SubmissionConflictError);
    await expect(
      repo.createLog({ id: ID, studentId: "s18", method: "cash", cashCents: 500 }),
    ).rejects.toBeInstanceOf(SubmissionConflictError);
  });

  it("writes nothing when a failure is injected, then recovers", async () => {
    const repo = make();
    const before = (await repo.listLogsForStudent("s18")).length;
    repo.setFailNextWrite(true);
    await expect(
      repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 5 }),
    ).rejects.toThrow("The connection dropped.");
    expect(repo.getFailNextWrite()).toBe(false);
    expect(await repo.listLogsForStudent("s18")).toHaveLength(before);
    await repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 5 });
    expect(await repo.listLogsForStudent("s18")).toHaveLength(before + 1);
  });

  it("rejects amounts the database would reject", async () => {
    const repo = make();
    await expect(
      repo.createLog({ id: ID, studentId: "s18", method: "cans", cans: 0 }),
    ).rejects.toThrow();
    await expect(
      repo.createLog({ id: ID, studentId: "s18", method: "cash", cashCents: 1.5 }),
    ).rejects.toThrow();
  });

  it("recomputes totals from logs after an edit, including a method switch", async () => {
    const repo = make();
    // Maya Rodriguez: 12 + 24 cans and $10.00 in the seed
    expect(await repo.getTotals("s01")).toEqual({ cans: 36, cashCents: 1000, canEquivalents: 46 });
    const [latest] = await repo.listLogsForStudent("s01");
    expect(latest.cans).toBe(12);
    const updated = await repo.updateLog(latest.id, { method: "cash", cashCents: 1550 });
    expect(updated).toMatchObject({ method: "cash", cans: null, cashCents: 1550 });
    expect(await repo.getTotals("s01")).toEqual({ cans: 24, cashCents: 2550, canEquivalents: 49 });
  });

  it("lists recent logs newest first with their student", async () => {
    const repo = make();
    const recent = await repo.listRecentLogs(8);
    expect(recent).toHaveLength(8);
    const times = recent.map((l) => l.createdAt);
    expect([...times].sort().reverse()).toEqual(times);
    expect(recent[0].student.id).toBe(recent[0].studentId);
  });
});

describe("MockVolunteerRepository with an injected roster", () => {
  const real = { id: "901", firstName: "Test", lastName: "Person", grade: 10 as const, homeroom: "P13(B)" };
  const directory = {
    search: async () => ({ exact: [real], exactTotal: 1, similar: [] }),
    get: async (id: string) => (id === real.id ? real : null),
  };
  const make = () =>
    new MockVolunteerRepository({ latency: { read: [0, 0], write: [0, 0] }, directory });

  it("starts with no logs and no seed students", async () => {
    const repo = make();
    expect(await repo.listRecentLogs(10)).toEqual([]);
    expect(await repo.getStudent("s01")).toBeNull();
  });

  it("logs against roster students and lists them with their details", async () => {
    const repo = make();
    await repo.createLog({ id: ID, studentId: "901", method: "cans", cans: 4 });
    const [recent] = await repo.listRecentLogs(10);
    expect(recent.student).toEqual(real);
    await expect(
      repo.createLog({ id: "00000000-0000-4000-8000-000000000002", studentId: "902", method: "cans", cans: 1 }),
    ).rejects.toThrow("Unknown student");
  });

  it("reset clears logs but keeps using the roster", async () => {
    const repo = make();
    await repo.createLog({ id: ID, studentId: "901", method: "cans", cans: 4 });
    repo.reset();
    expect(await repo.listRecentLogs(10)).toEqual([]);
    expect((await repo.searchStudents("test")).exact).toEqual([real]);
  });
});
