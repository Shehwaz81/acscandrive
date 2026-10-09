/**
 * Reward rules for the Student Standings page, in one place so the profile
 * builder and the UI can't disagree. No I/O.
 *
 * Confirmed (owner, 2026-09-29): $1 = 1 can; dress-down at 10 cans or $10 in
 * any mix; dodgeball for the first 20 homerooms to reach class size × 10.
 *
 * Everything marked `confirmed: false` is a PLACEHOLDER so progress can be
 * shown. Nothing may be presented as final ("Eligible", "Qualified") on a
 * placeholder. Ask the owner, then change the value and flip the flag here.
 */

import { DRIVE } from "../site";
import { torontoClock, torontoDayKey } from "../volunteer/time";

const DAY_MS = 86_400_000;

/** Calendar dates at noon UTC: no DST, so stepping a day never skips or repeats one. */
const atNoon = (date: string) => Date.parse(`${date}T12:00Z`);
export const addDays = (date: string, days: number) =>
  new Date(atNoon(date) + days * DAY_MS).toISOString().slice(0, 10);
/** 0 = Sunday … 5 = Friday. */
const weekday = (date: string) => new Date(atNoon(date)).getUTCDay();

export type Window = { friday: string; windowStart: string; windowEnd: string };

/**
 * One window per Friday in the drive. Placeholder shape: each runs from the
 * day after the previous window ended through the Thursday before its Friday;
 * the first starts on the drive's first day.
 */
export function dressDownWindows(startDate: string, endDate: string): Window[] {
  const windows: Window[] = [];
  let windowStart = startDate;
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    if (weekday(d) !== 5) continue;
    const windowEnd = addDays(d, -1);
    windows.push({ friday: d, windowStart, windowEnd });
    windowStart = addDays(windowEnd, 1);
  }
  return windows;
}

export const DRESS_DOWN = {
  /** Confirmed: 10 cans or $10, any mix. */
  threshold: 10,
  /** Which days count toward which Friday. */
  windows: { confirmed: false, value: dressDownWindows(DRIVE.startDate, DRIVE.endDate) },
  /** Last counted minute on the window's Thursday, Toronto wall-clock. */
  cutoff: { confirmed: false, value: "23:59" },
  /** Whether cans beyond 10 count toward a later Friday. */
  carryover: { confirmed: false, value: false },
};

export type DressDownRules = typeof DRESS_DOWN;

/** True only once every dress-down placeholder has been confirmed. */
export const dressDownConfirmed = (rules: DressDownRules = DRESS_DOWN) =>
  rules.windows.confirmed && rules.cutoff.confirmed && rules.carryover.confirmed;

/** How equal totals are settled (lunch vouchers, the table). Unconfirmed: the page shows ties and settles nothing. */
export const TIES = { confirmed: false };

export const DODGEBALL = {
  /** Confirmed: class size × 10. */
  perStudent: 10,
  /** Confirmed: the first 20 homerooms. */
  places: 20,
  /**
   * How "first" is decided is not confirmed, so a place exists only when it is
   * recorded (`dodgeball_places`, see supabase/drafts). It is never derived
   * from totals or from the leaderboard order.
   */
  qualificationOrder: { confirmed: false },
};

/** Has the window's cutoff passed at `now`? */
export function windowClosed(w: Window, cutoff: string, now: Date): boolean {
  const today = torontoDayKey(now);
  return today > w.windowEnd || (today === w.windowEnd && torontoClock(now) > cutoff);
}

/**
 * Early donations (owner, 2026-10-03, so the page can be tried before the
 * drive opens): a donation dated before the drive's first day, in the same
 * calendar year, counts toward that drive: its first dress-down window and
 * the homeroom's dodgeball total. Earlier years never count.
 */
export const earlyFrom = (startDate: string) => `${startDate.slice(0, 4)}-01-01`;

/** Does a donation at this instant count toward the window? `from` widens the first window to early donations. */
export function inWindow(w: Window, cutoff: string, occurredAt: string, from: string = w.windowStart): boolean {
  const day = torontoDayKey(occurredAt);
  if (day < from || day > w.windowEnd) return false;
  return day < w.windowEnd || torontoClock(occurredAt) <= cutoff;
}

/**
 * The Friday to show: the next one whose cutoff hasn't passed (the first one
 * before the drive starts), or the last one once every cutoff has passed.
 */
export function relevantWindow(
  now: Date,
  rules: DressDownRules = DRESS_DOWN,
): { index: number; phase: "before" | "open" | "ended" } | null {
  const windows = rules.windows.value;
  if (windows.length === 0) return null;
  const index = windows.findIndex((w) => !windowClosed(w, rules.cutoff.value, now));
  if (index === -1) return { index: windows.length - 1, phase: "ended" };
  return { index, phase: torontoDayKey(now) < windows[0].windowStart ? "before" : "open" };
}

// --- Drives --------------------------------------------------------------------

/** Drives with known dates. "All-time" spans every log; a homeroom's dodgeball total spans one drive. */
export const DRIVES = [{ label: "Fall 2026 drive", startDate: DRIVE.startDate, endDate: DRIVE.endDate }];

export const CURRENT_DRIVE = DRIVES[0];

/** Is this instant inside the drive's Toronto dates? */
export function inDrive(occurredAt: string, drive: { startDate: string; endDate: string } = CURRENT_DRIVE): boolean {
  const day = torontoDayKey(occurredAt);
  return day >= drive.startDate && day <= drive.endDate;
}

/** Does this donation count toward the drive's totals? The drive's dates, plus early donations. */
export function countsTowardDrive(occurredAt: string, drive: { startDate: string; endDate: string } = CURRENT_DRIVE): boolean {
  const day = torontoDayKey(occurredAt);
  return day >= earlyFrom(drive.startDate) && day <= drive.endDate;
}

/** Heading a donation is grouped under in a student's history. */
export function driveLabel(occurredAt: string): string {
  const drive = DRIVES.find((d) => inDrive(occurredAt, d));
  return drive ? drive.label : `${torontoDayKey(occurredAt).slice(0, 4)} · outside drive dates`;
}
