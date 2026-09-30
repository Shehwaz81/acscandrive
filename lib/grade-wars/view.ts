/**
 * What the Grade Wars section shows for each state: pure, so the podium,
 * the breakdown and the live announcement all agree, and tests can use it.
 */

import { fmt, ordinalSuffix } from "../homepage";
import { DRIVE } from "../site";
import { longDate } from "./format";
import { rankDay, type RankedGrade } from "./rank";
import type { GradeDayResult } from "./types";
import type { GradeWarsStatus } from "./use-grade-wars";

export type Board =
  | { kind: "ranked"; live: boolean; ranked: RankedGrade[]; dayTotal: number }
  | { kind: "empty" | "loading" | "error" | "upcoming" };

export function boardFor(status: GradeWarsStatus, result: GradeDayResult | null): Board {
  if (status === "error" || status === "upcoming") return { kind: status };
  if (status !== "ready" || !result) return { kind: "loading" };
  const { ranked, dayTotal, isEmpty } = rankDay(result.totals);
  if (isEmpty) return { kind: "empty" };
  return { kind: "ranked", live: result.day.status === "in_progress", ranked, dayTotal };
}

/** Status chip text, and the status card text for boards with no ranking. */
export function statusText(board: Board): { chip: string; card: string | null } {
  switch (board.kind) {
    case "ranked":
      return { chip: board.live ? "In progress" : "Final", card: null };
    case "empty":
      return { chip: "No donations", card: "No donations recorded — no ranking and no winner for this day." };
    case "loading":
      return { chip: "Loading…", card: "Loading daily totals…" };
    case "error":
      return { chip: "Unavailable", card: "Daily totals unavailable" };
    case "upcoming":
      return { chip: "Not started", card: `Grade Wars starts ${longDate(DRIVE.startDate)}` };
  }
}

/** "1st" */
export const rankText = (rank: number) => `${rank}${ordinalSuffix(rank)}`;

export type TagTone = "winner" | "leading" | "tied-lead" | "tied";

/** The text tag every tie and every leader gets; colour is never the only signal. */
export function tagFor(g: RankedGrade, live: boolean): { label: string; tone: TagTone } | null {
  if (g.rank === 1) {
    if (g.tied) return { label: live ? "Tied lead" : "Tied 1st", tone: "tied-lead" };
    return live ? { label: "Leading today", tone: "leading" } : { label: "Day winner", tone: "winner" };
  }
  return g.tied ? { label: `Tied ${rankText(g.rank)}`, tone: "tied" } : null;
}

/** The single marker note beside the leader: desktop and mobile wording. */
export function leadNote(ranked: RankedGrade[], live: boolean): { desktop: string; mobile: string } {
  const [leader, next] = ranked;
  if (leader.tied) return { desktop: "← dead even — shared 1st", mobile: "dead even — shared 1st!" };
  const lead = leader.total - next.total;
  return live
    ? { desktop: `← up ${fmt(lead)} so far`, mobile: `Gr. ${leader.grade} up ${fmt(lead)} so far` }
    : { desktop: `← +${fmt(lead)} over Gr. ${next.grade}`, mobile: `Gr. ${leader.grade} by ${fmt(lead)}!` };
}

/** Read by the polite live region after the day changes. */
export function announcement(board: Board, date: string | null): string {
  const day = date ? `${longDate(date)}. ` : "";
  if (board.kind !== "ranked") return day + statusText(board).card;
  const places = board.ranked
    .map((g) => `Grade ${g.grade}: ${g.tied ? "tied " : ""}${rankText(g.rank)}, ${fmt(g.total)} can-equivalents.`)
    .join(" ");
  return `${day}${board.live ? "In progress. " : ""}${places}`;
}
