import { describe, expect, it } from "vitest";
import { canEquivalents, formatAmount, formatCents, parseDollarsToCents } from "./money";

describe("money", () => {
  it("formats cents as dollars", () => {
    expect(formatCents(1750)).toBe("$17.50");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(125075)).toBe("$1,250.75");
  });
  it("parses dollar strings to cents exactly", () => {
    expect(parseDollarsToCents("17.5")).toBe(1750);
    expect(parseDollarsToCents("0.07")).toBe(7);
    expect(parseDollarsToCents("19.99")).toBe(1999);
  });
  it("counts $1 as one can and drops partial dollars", () => {
    expect(canEquivalents(36, 1000)).toBe(46);
    expect(canEquivalents(0, 1799)).toBe(17);
    expect(canEquivalents(0, 99)).toBe(0);
  });
  it("labels amounts by method", () => {
    expect(formatAmount({ method: "cans", cans: 1 })).toBe("1 can");
    expect(formatAmount({ method: "cans", cans: 12 })).toBe("12 cans");
    expect(formatAmount({ method: "cash", cashCents: 1000 })).toBe("$10.00");
  });
});
