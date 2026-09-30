/**
 * Street claims on the collection map: shared types, request parsing and the
 * pure functions that turn private rows into public labels. No I/O here, so
 * the client can import the types and tests can use synthetic rows. Database
 * access lives in claims.server.ts.
 */

import { ESSEX_COUNTY_BOUNDS } from "./collection-area";
import { publicName } from "./homepage";

/** A claim as the public sees it. The claimer is "First L. (HR)", nothing else. */
export type PublicClaim = { placeId: string; address: string; lat: number; lng: number; claimer: string };

/**
 * A name-picker suggestion: "Maya R." and "10B" (together, the public label)
 * and an opaque, server-sealed reference to the student.
 */
export type StudentOption = { ref: string; name: string; homeroom: string };

export const optionLabel = (o: Pick<StudentOption, "name" | "homeroom">) => `${o.name} (${o.homeroom})`;

export type ClaimInput = { student: string; placeId: string; address: string; lat: number; lng: number };
export type DeleteInput = { student: string; placeId: string };

/** Letters needed before the picker searches. */
export const MIN_QUERY = 2;
/** Suggestions per search; typing more of the name narrows it. */
export const MAX_OPTIONS = 8;

export const NOT_FOUND_MESSAGE = "We couldn't find you. Ask at the desk.";
export const PICK_AGAIN_MESSAGE = "Pick your name from the list again.";
export const NOT_YOURS_MESSAGE = "That name doesn't match this claim.";

/** The student columns a claim label needs. No id, grade or teacher leaves the server. */
export type ClaimerRow = { first_name: string; last_name: string; hr: string };
export type ClaimRow = { place_id: string; address: string; lat: number; lng: number; students: ClaimerRow };

/** "Maya R. (10B)", like top donors plus the homeroom. */
export function claimerLabel(s: { firstName: string; lastName: string; homeroom: string }): string {
  return optionLabel({ name: publicName(s), homeroom: s.homeroom.trim() });
}

export function toPublicClaim(r: ClaimRow): PublicClaim {
  const { first_name, last_name, hr } = r.students;
  return {
    placeId: r.place_id,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    claimer: claimerLabel({ firstName: first_name, lastName: last_name, homeroom: hr }),
  };
}

/** The public list, sorted by street. Built field by field so nothing else can slip out. */
export function buildClaims(rows: ClaimRow[]): PublicClaim[] {
  return rows.map(toPublicClaim).sort((a, b) => a.address.localeCompare(b.address, "en"));
}

// ---- Input boundary: request bodies are untrusted JSON. ----

const MAX_REF = 200;
const MAX_PLACE_ID = 300;
const MAX_ADDRESS = 200;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

/** Inside the rectangle the street search is restricted to. The full Essex County check runs in the browser. */
function inArea(lat: unknown, lng: unknown): boolean {
  const b = ESSEX_COUNTY_BOUNDS;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= b.south &&
    lat <= b.north &&
    lng >= b.west &&
    lng <= b.east
  );
}

export function parseDeleteInput(body: unknown): DeleteInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const student = text(b.student, MAX_REF);
  const placeId = text(b.placeId, MAX_PLACE_ID);
  return student && placeId ? { student, placeId } : null;
}

export function parseClaimInput(body: unknown): ClaimInput | null {
  const who = parseDeleteInput(body);
  if (!who) return null;
  const { address: rawAddress, lat, lng } = body as Record<string, unknown>;
  const address = text(rawAddress, MAX_ADDRESS);
  if (!address || !inArea(lat, lng)) return null;
  return { ...who, address, lat: lat as number, lng: lng as number };
}
