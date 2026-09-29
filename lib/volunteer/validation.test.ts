import { describe, expect, it } from "vitest";
import { amountToInput, isLargeAmount, parseAmount, sanitizeAmountInput } from "./validation";

const err = (method: "cans" | "cash", raw: string) => {
  const r = parseAmount(method, raw);
  return r.ok ? null : r.message;
};

describe("parseAmount: cans", () => {
  it("accepts whole numbers, ignoring commas", () => {
    expect(parseAmount("cans", "12")).toEqual({ ok: true, amount: { method: "cans", cans: 12 } });
    expect(parseAmount("cans", "1")).toEqual({ ok: true, amount: { method: "cans", cans: 1 } });
    expect(parseAmount("cans", "9,99")).toEqual({ ok: true, amount: { method: "cans", cans: 999 } });
  });
  it("explains each problem", () => {
    expect(err("cans", "")).toBe("Enter how many cans.");
    expect(err("cans", "  ")).toBe("Enter how many cans.");
    expect(err("cans", "2.5")).toBe("Cans are counted in whole numbers — no decimals.");
    expect(err("cans", "3.")).toBe("Cans are counted in whole numbers — no decimals.");
    expect(err("cans", "0")).toBe("The amount has to be more than zero.");
    expect(err("cans", "1000")).toBe("That's over 999 cans in one log. Check the count.");
  });
});

describe("parseAmount: cash", () => {
  it("converts to integer cents without float error", () => {
    expect(parseAmount("cash", "5")).toEqual({ ok: true, amount: { method: "cash", cashCents: 500 } });
    expect(parseAmount("cash", "5.2")).toEqual({ ok: true, amount: { method: "cash", cashCents: 520 } });
    expect(parseAmount("cash", "0.29")).toEqual({ ok: true, amount: { method: "cash", cashCents: 29 } });
    expect(parseAmount("cash", "1,250.75")).toEqual({
      ok: true,
      amount: { method: "cash", cashCents: 125075 },
    });
    expect(parseAmount("cash", "2000")).toEqual({ ok: true, amount: { method: "cash", cashCents: 200000 } });
  });
  it("explains each problem", () => {
    expect(err("cash", "")).toBe("Enter the dollar amount.");
    expect(err("cash", "5.255")).toBe("Enter dollars and cents, like 5 or 5.25.");
    expect(err("cash", ".5")).toBe("Enter dollars and cents, like 5 or 5.25.");
    expect(err("cash", "5..2")).toBe("Enter dollars and cents, like 5 or 5.25.");
    expect(err("cash", "0.00")).toBe("The amount has to be more than zero.");
    expect(err("cash", "2000.01")).toBe("That's over $2,000 in one log. Check the amount.");
  });
});

describe("helpers", () => {
  it("strips everything but digits, dots and commas", () => {
    expect(sanitizeAmountInput("$1,2a3.4-5 ")).toBe("1,23.45");
  });
  it("flags big amounts at 100 of either unit", () => {
    expect(isLargeAmount({ method: "cans", cans: 99 })).toBe(false);
    expect(isLargeAmount({ method: "cans", cans: 100 })).toBe(true);
    expect(isLargeAmount({ method: "cash", cashCents: 9999 })).toBe(false);
    expect(isLargeAmount({ method: "cash", cashCents: 10000 })).toBe(true);
  });
  it("round-trips stored amounts into the input", () => {
    expect(amountToInput({ method: "cash", cashCents: 1750 })).toBe("17.50");
    expect(amountToInput({ method: "cash", cashCents: 1000 })).toBe("10");
    expect(amountToInput({ method: "cash", cashCents: 5 })).toBe("0.05");
    expect(amountToInput({ method: "cans", cans: 12 })).toBe("12");
  });
});
