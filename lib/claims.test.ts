import { describe, expect, it } from "vitest";
import { buildClaims, claimerLabel, matchStudent, normalize, parseClaimInput, parseDeleteInput } from "./claims";

// Synthetic students only.
const roster = [
  { student_id: 1, first_name: "Maya", last_name: "Rivers", hr: "10B" },
  { student_id: 2, first_name: "Maya", last_name: "Rivers", hr: "11A" },
  { student_id: 3, first_name: "Sam", last_name: "Okafor", hr: "9C" },
  { student_id: 4, first_name: "Sam", last_name: "Okafor", hr: "9C" },
  { student_id: 5, first_name: "Anne Marie", last_name: "de la Cruz", hr: "12D" },
];

describe("normalize", () => {
  it("trims, lowercases and collapses repeated spaces", () => {
    expect(normalize("  Maya \t  RIVERS ")).toBe("maya rivers");
  });
});

describe("matchStudent", () => {
  it("tells apart the same name in different homerooms", () => {
    expect(matchStudent(roster, "Maya Rivers", "10B")?.student_id).toBe(1);
    expect(matchStudent(roster, "Maya Rivers", "11A")?.student_id).toBe(2);
  });

  it("ignores case and spacing in the name and homeroom", () => {
    expect(matchStudent(roster, "  maya   RIVERS ", "10b")?.student_id).toBe(1);
    expect(matchStudent(roster, "anne  marie de la  cruz", "12D")?.student_id).toBe(5);
  });

  it("returns null for the same name twice in one homeroom", () => {
    expect(matchStudent(roster, "Sam Okafor", "9C")).toBeNull();
  });

  it("returns null for a wrong homeroom, a partial name or a first name only", () => {
    expect(matchStudent(roster, "Maya Rivers", "9C")).toBeNull();
    expect(matchStudent(roster, "Maya Riv", "10B")).toBeNull();
    expect(matchStudent(roster, "Maya", "10B")).toBeNull();
  });
});

describe("public claimer", () => {
  it('is "First L. (HR)"', () => {
    expect(claimerLabel(roster[0])).toBe("Maya R. (10B)");
    expect(claimerLabel(roster[4])).toBe("Anne Marie D. (12D)");
  });

  it("builds claims with only the public fields, sorted by street", () => {
    const row = (place_id: string, address: string) => ({
      place_id,
      address,
      lat: 42.3,
      lng: -83,
      // Extra columns a careless select could add must not pass through.
      student_id: 1,
      students: { ...roster[0], student_id: 1, hr_teacher: "Ms. Teacher" },
    });
    const claims = buildClaims([row("p2", "Wyandotte Street, Windsor"), row("p1", "Ouellette Avenue, Windsor")]);
    expect(claims).toEqual([
      { placeId: "p1", address: "Ouellette Avenue, Windsor", lat: 42.3, lng: -83, claimer: "Maya R. (10B)" },
      { placeId: "p2", address: "Wyandotte Street, Windsor", lat: 42.3, lng: -83, claimer: "Maya R. (10B)" },
    ]);
    expect(JSON.stringify(claims)).not.toMatch(/Rivers|student_id|Teacher/);
  });
});

describe("request parsing", () => {
  const body = { name: " Maya Rivers ", homeroom: "10B", placeId: "ChIJabc", address: "Ouellette Avenue, Windsor", lat: 42.31, lng: -83.03 };

  it("accepts a valid claim and trims text", () => {
    expect(parseClaimInput(body)).toEqual({ ...body, name: "Maya Rivers" });
  });

  it("rejects missing, empty, overlong or wrongly typed fields", () => {
    expect(parseClaimInput(null)).toBeNull();
    expect(parseClaimInput({ ...body, name: "   " })).toBeNull();
    expect(parseClaimInput({ ...body, name: "x".repeat(101) })).toBeNull();
    expect(parseClaimInput({ ...body, address: "x".repeat(201) })).toBeNull();
    expect(parseClaimInput({ ...body, placeId: 7 })).toBeNull();
    expect(parseClaimInput({ ...body, lat: "42.31" })).toBeNull();
  });

  it("rejects coordinates outside the Essex County search rectangle", () => {
    expect(parseClaimInput({ ...body, lat: 43.65, lng: -79.38 })).toBeNull(); // Toronto
    expect(parseClaimInput({ ...body, lat: Number.NaN })).toBeNull();
    expect(parseClaimInput({ ...body, lat: 91 })).toBeNull();
  });

  it("parses a delete without coordinates", () => {
    expect(parseDeleteInput({ placeId: "ChIJabc", name: "Maya Rivers", homeroom: "10B" })).toEqual({
      placeId: "ChIJabc",
      name: "Maya Rivers",
      homeroom: "10B",
    });
    expect(parseDeleteInput({ placeId: "ChIJabc", name: "Maya Rivers" })).toBeNull();
  });
});
