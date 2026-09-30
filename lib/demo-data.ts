/**
 * DEMO DATA ONLY: the collection map's schematic zone grid. The real area
 * model and booking rule are still undecided (see the street-reservations
 * skill). Homepage figures come from getHomepageData(), not this file.
 */

export const ZONE_ROWS = ["A", "B", "C", "D"] as const;
export const ZONE_COLS = 5;
export const SCHOOL_ZONE = "C3";
export const TAKEN_ZONES = new Set(["A2", "A4", "B1", "B4", "C5", "D2", "D3"]);
