import { describe, expect, it } from "vitest";
import { buildClaims, claimerLabel, parseClaimInput, parseDeleteInput } from "./claims";

// Synthetic students only.
const maya = { first_name: "Maya", last_name: "Rivers", hr: "10B" };

describe("public claimer", () => {
  it('is "First L. (HR)"', () => {
    expect(claimerLabel({ firstName: "Maya", lastName: "Rivers", homeroom: "10B" })).toBe("Maya R. (10B)");
    expect(claimerLabel({ firstName: "Anne Marie", lastName: "de la Cruz", homeroom: " 12D " })).toBe(
      "Anne Marie D. (12D)",
    );
  });

  it("builds claims with only the public fields, sorted by street", () => {
    const row = (place_id: string, address: string) => ({
      place_id,
      address,
      lat: 42.3,
      lng: -83,
      // Extra columns a careless select could add must not pass through.
      student_id: 1,
      students: { ...maya, student_id: 1, hr_teacher: "Ms. Teacher" },
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
  const body = { student: " sealed-ref ", placeId: "ChIJabc", address: "Ouellette Avenue, Windsor", lat: 42.31, lng: -83.03 };

  it("accepts a valid claim and trims text", () => {
    expect(parseClaimInput(body)).toEqual({ ...body, student: "sealed-ref" });
  });

  it("rejects missing, empty, overlong or wrongly typed fields", () => {
    expect(parseClaimInput(null)).toBeNull();
    expect(parseClaimInput({ ...body, student: "   " })).toBeNull();
    expect(parseClaimInput({ ...body, student: "x".repeat(201) })).toBeNull();
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
    expect(parseDeleteInput({ placeId: "ChIJabc", student: "sealed-ref" })).toEqual({ placeId: "ChIJabc", student: "sealed-ref" });
    expect(parseDeleteInput({ placeId: "ChIJabc", name: "Maya Rivers", homeroom: "10B" })).toBeNull();
  });
});
