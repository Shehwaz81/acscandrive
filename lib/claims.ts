/**
 * Street claims on the collection map: shared types, request parsing, student
 * matching and the pure function that turns private rows into the public list.
 * No I/O here, so the client can import the types and tests can use synthetic
 * rows. Database access lives in claims.server.ts.
 */

import { ESSEX_COUNTY_BOUNDS } from "./collection-area";
import { publicName } from "./homepage";

/** A claim as the public sees it. The claimer is "First L. (HR)", nothing else. */
export type PublicClaim = { placeId: string; address: string; lat: number; lng: number; claimer: string };

export type ClaimInput = { name: string; homeroom: string; placeId: string; address: string; lat: number; lng: number };
export type DeleteInput = { name: string; homeroom: string; placeId: string };

export const NOT_FOUND_MESSAGE = "We couldn't find you. Check your name and homeroom, or ask at the desk.";
export const NOT_YOURS_MESSAGE = "That name and homeroom don't match this claim.";

/** The student columns a claim needs. No student_id, grade or teacher leaves the server. */
export type ClaimerRow = { first_name: string; last_name: string; hr: string };
export type ClaimRow = { place_id: string; address: string; lat: number; lng: number; students: ClaimerRow };

// ---- Names ----

/** Trimmed, case-insensitive, repeated spaces collapsed. */
export function normalize(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The one student whose "first last" and homeroom match, or null. A name is
 * never unique on its own: two matches in the same homeroom are as unusable as
 * none, so both return null.
 */
export function matchStudent<T extends ClaimerRow>(rows: T[], name: string, homeroom: string): T | null {
  const n = normalize(name);
  const hr = normalize(homeroom);
  const hits = rows.filter((r) => normalize(r.hr) === hr && normalize(`${r.first_name} ${r.last_name}`) === n);
  return hits.length === 1 ? hits[0] : null;
}

/** "Maya R. (10B)", like top donors plus the homeroom. */
export function claimerLabel(s: ClaimerRow): string {
  return `${publicName({ firstName: s.first_name, lastName: s.last_name })} (${s.hr.trim()})`;
}

export function toPublicClaim(r: ClaimRow): PublicClaim {
  return { placeId: r.place_id, address: r.address, lat: r.lat, lng: r.lng, claimer: claimerLabel(r.students) };
}

/** The public list, sorted by street. Built field by field so nothing else can slip out. */
export function buildClaims(rows: ClaimRow[]): PublicClaim[] {
  return rows.map(toPublicClaim).sort((a, b) => a.address.localeCompare(b.address, "en"));
}

// ---- Input boundary: request bodies are untrusted JSON. ----

const MAX_NAME = 100;
const MAX_HOMEROOM = 20;
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
  const name = text(b.name, MAX_NAME);
  const homeroom = text(b.homeroom, MAX_HOMEROOM);
  const placeId = text(b.placeId, MAX_PLACE_ID);
  return name && homeroom && placeId ? { name, homeroom, placeId } : null;
}

export function parseClaimInput(body: unknown): ClaimInput | null {
  const who = parseDeleteInput(body);
  if (!who) return null;
  const { address: rawAddress, lat, lng } = body as Record<string, unknown>;
  const address = text(rawAddress, MAX_ADDRESS);
  if (!address || !inArea(lat, lng)) return null;
  return { ...who, address, lat: lat as number, lng: lng as number };
}
