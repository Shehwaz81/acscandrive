/**
 * Wording for the Student Standings page: pure, so the shelf, the table, the
 * student view and their tests agree on every label.
 */

import { shortDate } from "../grade-wars/format";
import { fmt, ordinalSuffix } from "../homepage";
import { formatCents } from "../volunteer/money";
import { formatTime } from "../volunteer/time";
import type { DressDownProgress, DressDownWindow, HomeroomProgress, PublicStudent, TodayEntry } from "./types";

export const fullName = (s: Pick<PublicStudent, "firstName" | "lastName">) => `${s.firstName} ${s.lastName}`;

/** "1 can", "46 cans". Public totals are can-equivalents labelled "cans" (owner's choice). */
export const cansLabel = (n: number) => `${fmt(n)} ${n === 1 ? "can" : "cans"}`;

/** "1st" */
export const rankText = (rank: number) => `${rank}${ordinalSuffix(rank)}`;

/** "36 cans · $10.00 cash" */
export const splitLabel = (cans: number, cashCents: number) => `${cansLabel(cans)} · ${formatCents(cashCents)} cash`;

/** "11:42 am", Toronto time. */
export const updatedLabel = (iso: string) => formatTime(iso).toLowerCase();

/** "Fri Oct 23" */
const plainDay = (date: string) => shortDate(date).replace(",", "");

/** "23:59" → "11:59 PM" */
function clockLabel(clock: string): string {
  const [h, m] = clock.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "FRI OCT 16 – THU OCT 22 · CUTOFF THU 11:59 PM" */
export function windowLabel(w: DressDownWindow): string {
  const end = plainDay(w.windowEnd);
  return `${plainDay(w.windowStart)} – ${end} · cutoff ${end.slice(0, 3)} ${clockLabel(w.cutoff)}`.toUpperCase();
}

/**
 * A window's outcome. On unconfirmed rules it only states the count against
 * the threshold; "Eligible" appears once the owner has confirmed the rules.
 */
export function dressDownStatus(w: DressDownWindow, p: Pick<DressDownProgress, "confirmed" | "threshold">): string {
  if (w.reached) return p.confirmed ? "Eligible" : `Reached ${p.threshold} by the cutoff`;
  if (w.closed) return `Below ${p.threshold} by the cutoff`;
  const more = p.threshold - w.counted;
  return `${more} more to reach the target`;
}

/** Dodgeball step, 1–3: below target, target reached, place confirmed. */
export const homeroomStep = (h: HomeroomProgress) => (h.status === "below" ? 1 : h.status === "reached" ? 2 : 3);

/** The one line under the class bar. "Qualified" needs a confirmed place. */
export function homeroomStatus(h: HomeroomProgress): string {
  if (h.status === "confirmed") return `Qualified · place ${h.place} of ${h.maxPlaces} confirmed`;
  if (h.status === "reached") return "Target reached · place not confirmed yet";
  return `${fmt(h.target - h.total)} more to reach the class target`;
}

/** Screen-reader label for a can on the shelf. */
export function shelfLabel(e: TodayEntry): string {
  return `${e.tied ? "Tied " : ""}${rankText(e.rank)} today: ${fullName(e)}, grade ${e.grade}, homeroom ${e.homeroom}, ${cansLabel(e.total)} today. Open details.`;
}

/** "Tied on 34 cans today. …" for the first tie on the shelf, or null. */
export function tieNote(podium: TodayEntry[]): string | null {
  const tied = podium.find((e) => e.tied);
  if (!tied) return null;
  return `Tied on ${cansLabel(tied.total)} today. Shown alphabetically; how ties are settled for lunch vouchers isn’t confirmed.`;
}
