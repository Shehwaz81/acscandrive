/**
 * Collection days are calendar dates ("2026-10-23"), not instants. Parsing
 * one with `new Date("2026-10-23")` gives UTC midnight, which is still the
 * 22nd in Toronto. So the date is pinned to noon UTC and formatted in UTC:
 * the calendar day never shifts, whatever the viewer's zone.
 */

function calendarDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const long = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
const short = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });

/** "Friday, October 23" */
export const longDate = (date: string) => long.format(calendarDate(date));
/** "Fri, Oct 23" */
export const shortDate = (date: string) => short.format(calendarDate(date));
/** "FRI" */
export const weekdayShort = (date: string) => weekday.format(calendarDate(date)).toUpperCase();
/** "23" */
export const dayOfMonth = (date: string) => String(Number(date.slice(8, 10)));

/** 10200 → "$102"; 10250 → "$102.50" */
export function cashLabel(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}
