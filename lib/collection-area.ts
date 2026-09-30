/**
 * Where students may pick a street to collect on: any whole street in Essex
 * County, Ontario (Windsor, Tecumseh, LaSalle, Amherstburg, Lakeshore, ...),
 * excluding highways and expressways. The Places search is also restricted to
 * this area, but its bounds are a rectangle that overlaps Detroit and ignore
 * municipal limits, so checkCollectionStreet() is what actually decides.
 */

/** Assumption College Catholic High School, 1100 Huron Church Rd, Windsor. */
export const SCHOOL_LOCATION = { lat: 42.3065, lng: -83.0661 };

/** A zoom that shows all of Windsor on the map's first load. */
export const INITIAL_ZOOM = 12;

/** Rectangle around Essex County, including Pelee Island. Used to restrict search. */
export const ESSEX_COUNTY_BOUNDS = { south: 41.66, west: -83.16, north: 42.4, east: -82.33 };

export const NOT_IN_AREA_MESSAGE = "Pick a street in Windsor or elsewhere in Essex County, Ontario.";
export const NOT_A_STREET_MESSAGE = "Pick a whole street, not an address or a place. Try just the street name.";
export const HIGHWAY_MESSAGE = "Highways and expressways can't be collected on. Pick a residential street.";

/** The fields of a Places (New) AddressComponent that the check reads. */
export type AddressPart = { longText: string | null; shortText: string | null; types: string[] };

export type StreetCheck =
  | { ok: true; street: string; municipality: string }
  | { ok: false; message: string };

// Named, not typed: Google labels highways as ordinary routes.
const HIGHWAY_PATTERNS = [/\bexpressway\b/i, /\bexpy\b/i, /\bhighway\b/i, /\bhwy\b/i, /\bherb gray parkway\b/i];

function part(parts: AddressPart[], type: string): AddressPart | undefined {
  return parts.find((p) => p.types.includes(type));
}

function isEssexCounty(name: string | null | undefined): boolean {
  return /^essex( county)?$/i.test(name?.trim() ?? "");
}

/** Accepts a place only if it is a whole street (a route) in Essex County, Ontario, and not a highway. */
export function checkCollectionStreet(placeTypes: string[], parts: AddressPart[]): StreetCheck {
  const country = part(parts, "country")?.shortText;
  const province = part(parts, "administrative_area_level_1")?.shortText;
  const county = part(parts, "administrative_area_level_2")?.longText;
  const locality = part(parts, "locality")?.longText;

  // Windsor is administratively separate from the county, so it may be
  // reported without a county component.
  const inArea =
    country === "CA" && province === "ON" && (isEssexCounty(county) || locality?.trim().toLowerCase() === "windsor");
  if (!inArea) return { ok: false, message: NOT_IN_AREA_MESSAGE };

  const route = part(parts, "route");
  const street = route?.longText?.trim();
  if (!placeTypes.includes("route") || !street) return { ok: false, message: NOT_A_STREET_MESSAGE };

  const names = [route?.longText, route?.shortText].filter((n): n is string => !!n);
  if (names.some((n) => HIGHWAY_PATTERNS.some((re) => re.test(n)))) return { ok: false, message: HIGHWAY_MESSAGE };

  const municipality =
    locality ?? part(parts, "administrative_area_level_3")?.longText ?? part(parts, "sublocality")?.longText ?? "Essex County";
  return { ok: true, street, municipality };
}
