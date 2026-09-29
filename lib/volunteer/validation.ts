import type { Amount, Method } from "./types";
import { parseDollarsToCents } from "./money";

export const MAX_CANS = 999;
export const MAX_CASH_CENTS = 200_000;
/** At or above this, show a soft "double-check" note. */
export const LARGE_CANS = 100;
export const LARGE_CASH_CENTS = 10_000;

export type AmountResult = { ok: true; amount: Amount } | { ok: false; message: string };

/** Drop anything that is not a digit, dot, or comma (applied on every keystroke). */
export function sanitizeAmountInput(raw: string): string {
  return raw.replace(/[^0-9.,]/g, "");
}

/** Validate what the volunteer typed. Commas are thousands separators and ignored. */
export function parseAmount(method: Method, raw: string): AmountResult {
  const value = sanitizeAmountInput(raw).replace(/,/g, "");

  if (method === "cans") {
    if (value === "") return { ok: false, message: "Enter how many cans." };
    if (!/^\d+$/.test(value)) {
      return { ok: false, message: "Cans are counted in whole numbers — no decimals." };
    }
    const cans = Number(value);
    if (cans <= 0) return { ok: false, message: "The amount has to be more than zero." };
    if (cans > MAX_CANS) {
      return { ok: false, message: "That's over 999 cans in one log. Check the count." };
    }
    return { ok: true, amount: { method, cans } };
  }

  if (value === "") return { ok: false, message: "Enter the dollar amount." };
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return { ok: false, message: "Enter dollars and cents, like 5 or 5.25." };
  }
  const cashCents = parseDollarsToCents(value);
  if (cashCents <= 0) return { ok: false, message: "The amount has to be more than zero." };
  if (cashCents > MAX_CASH_CENTS) {
    return { ok: false, message: "That's over $2,000 in one log. Check the amount." };
  }
  return { ok: true, amount: { method, cashCents } };
}

export function isLargeAmount(amount: Amount): boolean {
  return amount.method === "cans"
    ? amount.cans >= LARGE_CANS
    : amount.cashCents >= LARGE_CASH_CENTS;
}

/** Text for an amount input showing an existing value (edit mode). */
export function amountToInput(amount: Amount): string {
  if (amount.method === "cans") return String(amount.cans);
  const whole = Math.floor(amount.cashCents / 100);
  const cents = amount.cashCents % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, "0")}`;
}
