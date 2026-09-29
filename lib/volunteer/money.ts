/** Money is integer cents everywhere; these convert only at the UI edge. */

const dollars = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
});

/** 1750 → "$17.50" */
export function formatCents(cents: number): string {
  return dollars.format(cents / 100);
}

/**
 * "5" → 500, "5.2" → 520, "5.25" → 525. Uses string arithmetic so values
 * like "0.29" never pass through a lossy float. Input must already match
 * `^\d+(\.\d{1,2})?$`.
 */
export function parseDollarsToCents(value: string): number {
  const [whole, frac = ""] = value.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** $1 counts as 1 can; partial dollars round down. */
export function canEquivalents(cans: number, cashCents: number): number {
  return cans + Math.floor(cashCents / 100);
}

type AmountLike = { method: "cans"; cans: number } | { method: "cash"; cashCents: number };

/** "12 cans", "1 can", "$10.00" */
export function formatAmount(a: AmountLike): string {
  if (a.method === "cash") return formatCents(a.cashCents);
  return `${a.cans} ${a.cans === 1 ? "can" : "cans"}`;
}

/** Amount of a stored log (whose unused field is null). */
export function logAmount(log: {
  method: "cans" | "cash";
  cans: number | null;
  cashCents: number | null;
}): AmountLike {
  return log.method === "cans"
    ? { method: "cans", cans: log.cans ?? 0 }
    : { method: "cash", cashCents: log.cashCents ?? 0 };
}
