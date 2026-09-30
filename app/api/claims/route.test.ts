// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOT_FOUND_MESSAGE, NOT_YOURS_MESSAGE } from "@/lib/claims";

// Route tests don't reach a database: the query functions are stubs, the parsers are real.
const db = vi.hoisted(() => ({ listClaims: vi.fn(), createClaim: vi.fn(), deleteClaim: vi.fn() }));
vi.mock("@/lib/claims.server", () => db);

const route = await import("./route");

const claim = { placeId: "p1", address: "Ouellette Avenue, Windsor", lat: 42.31, lng: -83.03, claimer: "Maya R. (10B)" };
const body = { name: "Maya Rivers", homeroom: "10B", placeId: "p1", address: claim.address, lat: 42.31, lng: -83.03 };
const req = (method: string, b: unknown) =>
  new NextRequest("http://localhost/api/claims", { method, body: JSON.stringify(b), headers: { "content-type": "application/json" } });

beforeEach(() => vi.clearAllMocks());

describe("claim routes", () => {
  it("reject bad input with 400 before touching the database", async () => {
    const created = await route.POST(req("POST", { ...body, lat: 999 }));
    const deleted = await route.DELETE(req("DELETE", { placeId: "p1" }));
    expect([created.status, deleted.status]).toEqual([400, 400]);
    expect(db.createClaim).not.toHaveBeenCalled();
    expect(db.deleteClaim).not.toHaveBeenCalled();
  });

  it("map claim results to 200, 409 and 404", async () => {
    db.createClaim
      .mockResolvedValueOnce({ status: "claimed", claim })
      .mockResolvedValueOnce({ status: "taken", claim })
      .mockResolvedValueOnce({ status: "unknown-student" });
    const ok = await route.POST(req("POST", body));
    const taken = await route.POST(req("POST", body));
    const unknown = await route.POST(req("POST", body));
    expect([ok.status, taken.status, unknown.status]).toEqual([200, 409, 404]);
    expect(await taken.json()).toEqual({ error: "taken", claim });
    expect(await unknown.json()).toEqual({ error: NOT_FOUND_MESSAGE });
  });

  it("map delete results to 200 and 403", async () => {
    db.deleteClaim.mockResolvedValueOnce("deleted").mockResolvedValueOnce("forbidden");
    const who = { placeId: "p1", name: "Maya Rivers", homeroom: "10B" };
    const ok = await route.DELETE(req("DELETE", who));
    const no = await route.DELETE(req("DELETE", who));
    expect([ok.status, no.status]).toEqual([200, 403]);
    expect(await no.json()).toEqual({ error: NOT_YOURS_MESSAGE });
  });

  it("answer 502 when the database fails", async () => {
    db.listClaims.mockRejectedValueOnce(new Error("down"));
    db.createClaim.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await route.GET()).status).toBe(502);
    expect((await route.POST(req("POST", body))).status).toBe(502);
  });
});
