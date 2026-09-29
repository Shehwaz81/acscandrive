import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake of the admin client's query chain: .from().select().order().range() / .eq().maybeSingle()
const rows = Array.from({ length: 1113 }, (_, i) => ({
  student_id: i + 1,
  first_name: `First${i}`,
  last_name: `Last${i}`,
  grade: 9 + (i % 4),
  hr: `${9 + (i % 4)}A`,
}));
const selects: string[] = [];
const ranges: [number, number][] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (cols: string) => {
        selects.push(cols);
        return {
          order: () => ({
            range: async (from: number, to: number) => {
              ranges.push([from, to]);
              // PostgREST caps a response at 1,000 rows even if the range asks for more.
              return { data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null };
            },
          }),
          eq: (_col: string, id: number) => ({
            maybeSingle: async () => ({ data: rows.find((r) => r.student_id === id) ?? null, error: null }),
          }),
        };
      },
    }),
  }),
}));

const { loadRoster, getRosterStudent } = await import("./roster.server");

beforeEach(() => {
  selects.length = 0;
  ranges.length = 0;
});

describe("roster.server", () => {
  it("pages past the 1,000-row response cap to load every student", async () => {
    const roster = await loadRoster();
    expect(roster).toHaveLength(1113);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(roster[1112]).toEqual({ id: "1113", firstName: "First1112", lastName: "Last1112", grade: 9, homeroom: "9A" });
  });

  it("never selects hr_teacher", async () => {
    await loadRoster();
    await getRosterStudent("5");
    expect(selects.every((c) => !c.includes("hr_teacher"))).toBe(true);
  });

  it("looks up one student and rejects non-numeric ids without querying", async () => {
    expect(await getRosterStudent("5")).toMatchObject({ id: "5", firstName: "First4" });
    expect(await getRosterStudent("99999")).toBeNull();
    expect(await getRosterStudent("1 or 1=1")).toBeNull();
    expect(selects).toHaveLength(2);
  });
});
