// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Route tests don't reach a database: the query functions are stubs.
const db = vi.hoisted(() => ({ searchStandingsStudents: vi.fn(), getStandingsProfile: vi.fn() }));
const flag = vi.hoisted(() => ({ source: "supabase" }));
vi.mock("@/lib/standings/standings.server", () => db);
vi.mock("@/lib/standings", () => ({
  get DATA_SOURCE() {
    return flag.source;
  },
}));

const search = await import("./route");
const profile = await import("./[ref]/route");

const get = (path: string) => new NextRequest(`http://localhost${path}`);
const ctx = (ref: string) => ({ params: Promise.resolve({ ref }) });

beforeEach(() => {
  vi.clearAllMocks();
  flag.source = "supabase";
});

describe("standings routes", () => {
  it("search without caching and cap the query at 100 characters", async () => {
    db.searchStandingsStudents.mockResolvedValue({ items: [], total: 0 });
    const res = await search.GET(get(`/api/standings/students?q=${"a".repeat(300)}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(db.searchStandingsStudents).toHaveBeenCalledWith("a".repeat(100));
  });

  it("answer 404 for an unknown or altered ref", async () => {
    db.getStandingsProfile.mockResolvedValue(null);
    const res = await profile.GET(get("/api/standings/students/tampered"), ctx("tampered"));
    expect(res.status).toBe(404);
  });

  it("answer 502 with an error, never an empty result, when the database fails", async () => {
    db.searchStandingsStudents.mockRejectedValue(new Error("down"));
    db.getStandingsProfile.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const a = await search.GET(get("/api/standings/students?q=maya"));
    const b = await profile.GET(get("/api/standings/students/ref"), ctx("ref"));
    expect([a.status, b.status]).toEqual([502, 502]);
    expect(await a.json()).toHaveProperty("error");
  });

  it("serve nothing while the data source is mock", async () => {
    flag.source = "mock";
    const a = await search.GET(get("/api/standings/students?q=maya"));
    const b = await profile.GET(get("/api/standings/students/ref"), ctx("ref"));
    expect([a.status, b.status]).toEqual([404, 404]);
    expect(db.searchStandingsStudents).not.toHaveBeenCalled();
    expect(db.getStandingsProfile).not.toHaveBeenCalled();
  });
});
