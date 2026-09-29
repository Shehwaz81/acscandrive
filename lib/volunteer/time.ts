/** Display times in the school's zone, never the device's or UTC. */
export const SCHOOL_TZ = "America/Toronto";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHOOL_TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHOOL_TZ,
  hour: "numeric",
  minute: "2-digit",
});

/** Local calendar day in Toronto, e.g. "2026-09-28". */
export function torontoDayKey(d: Date | string): string {
  return dayKeyFmt.format(new Date(d));
}

export function isTodayToronto(iso: string, now: Date = new Date()): boolean {
  return torontoDayKey(iso) === torontoDayKey(now);
}

/** "Today" or "Fri, Sep 25". */
export function formatDay(iso: string, now: Date = new Date()): string {
  return isTodayToronto(iso, now) ? "Today" : dayFmt.format(new Date(iso));
}

/** "10:38 AM" */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "Today, 10:38 AM" */
export function formatDayTime(iso: string, now: Date = new Date()): string {
  return `${formatDay(iso, now)}, ${formatTime(iso)}`;
}
