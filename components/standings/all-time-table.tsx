"use client";

import { fmt } from "@/lib/homepage";
import { TOP_N } from "@/lib/standings/build";
import { cansLabel, fullName, rankText } from "@/lib/standings/format";
import type { RankedStudent, StudentRef } from "@/lib/standings/types";
import { WRAP } from "@/lib/site";
import { formatCents } from "@/lib/volunteer/money";
import { gradeText } from "@/lib/volunteer/types";
import type { OpenStudent, PageData } from "./today-shelf";

/** Under the table: how many are shown and why, never implying a tiebreaker. */
export function tableNote(rows: RankedStudent[], donorCount: number): string {
  const ties = "Equal totals share a rank; within a tie, names are listed alphabetically and that order decides nothing.";
  if (donorCount === 0) return "No donations are on record yet, so there is no ranking.";
  if (rows.length === donorCount && donorCount <= TOP_N) {
    return `All ${fmt(donorCount)} ${donorCount === 1 ? "student" : "students"} with recorded donations. ${ties}`;
  }
  const last = rows[rows.length - 1];
  const tiedAtLast = rows.filter((r) => r.rank === last.rank).length;
  const extra =
    rows.length > TOP_N ? `${rows.length} shown: ${tiedAtLast} students are tied for ${rankText(last.rank)}. ` : "";
  return `${extra}The top ${TOP_N} of ${fmt(donorCount)} students with recorded donations. ${ties}`;
}

/** The all-time top 25: every counted donation on record, no date filter. */
export function AllTimeTable({
  page,
  selected,
  onOpen,
  onRetry,
  onFind,
}: {
  page: PageData;
  /** The student whose details are open. */
  selected: StudentRef | null;
  onOpen: OpenStudent;
  onRetry: () => void;
  /** Scrolls to the search and focuses it. */
  onFind: () => void;
}) {
  const allTime = page.kind === "ready" ? page.data.allTime : null;
  const rows = allTime?.rows ?? [];
  const firstLower = rows.findIndex((r) => r.rank > 10);

  return (
    <section id="all-time" aria-labelledby="all-time-title" className="scroll-mt-36 bg-ink text-paper lg:scroll-mt-4">
      <div className={`${WRAP} flex flex-col gap-7 pt-10 pb-11 lg:gap-10 lg:pt-[88px] lg:pb-24`}>
        <div className="flex flex-col gap-3 lg:gap-4">
          <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-butter lg:text-xs">
            02 · ALL-TIME · EVERY DRIVE ON RECORD
          </span>
          <h2 id="all-time-title" className="font-display text-[72px] leading-[.8] font-black uppercase lg:text-[132px]">
            All-time
            <br />
            top <span className="text-butter">{TOP_N}</span>
          </h2>
          <p className="mt-1 text-[15.5px] text-rule lg:text-[17px]">Total contributions across all recorded donations.</p>
        </div>

        {page.kind === "error" ? (
          <div className="flex flex-col items-start gap-3 border-[3px] border-paper p-5 lg:p-7">
            <p className="font-display text-[28px] leading-none font-extrabold uppercase lg:text-4xl">
              The all-time table didn’t load
            </p>
            <p className="text-[15px] text-rule lg:text-base">Nobody’s total is zero; we just couldn’t reach the records.</p>
            <button type="button" onClick={onRetry} className="mt-1 h-11 bg-paper px-5 text-[15px] font-bold text-ink hover:bg-butter">
              Try again
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">All-time top {TOP_N} students by total contributions</caption>
            <thead>
              <tr className="border-b-2 border-paper font-mono text-[11px] font-semibold tracking-[.1em] text-rule lg:text-[11.5px]">
                <th scope="col" className="w-[68px] pb-3 pl-2 font-semibold lg:w-[150px] lg:pl-5">
                  RANK
                </th>
                <th scope="col" className="pb-3 font-semibold">
                  STUDENT
                </th>
                <th scope="col" className="hidden w-[130px] pb-3 font-semibold lg:table-cell">
                  GRADE
                </th>
                <th scope="col" className="hidden w-[170px] pb-3 font-semibold lg:table-cell">
                  HOMEROOM
                </th>
                <th scope="col" className="pr-2 pb-3 text-right font-semibold lg:pr-5">
                  ALL-TIME CANS
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <Row key={r.ref} row={r} divider={i === firstLower && i > 0} selected={r.ref === selected} onOpen={onOpen} />
              ))}
            </tbody>
          </table>
        )}

        {allTime && (
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <p className="max-w-[720px] text-sm text-rule">{tableNote(rows, allTime.donorCount)}</p>
            <button
              type="button"
              onClick={onFind}
              className="h-12 flex-none border-2 border-paper px-5 text-[15px] font-bold whitespace-nowrap hover:bg-paper hover:text-ink"
            >
              Not listed? Find a student <span aria-hidden>↑</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({
  row,
  divider,
  selected,
  onOpen,
}: {
  row: RankedStudent;
  divider: boolean;
  selected: boolean;
  onOpen: OpenStudent;
}) {
  const top = row.rank <= 3;
  return (
    <>
      {divider && (
        <tr aria-hidden>
          <td colSpan={5} className="border-b border-dashed border-paper/50 pt-5 pb-2 pl-2 font-mono text-[11px] tracking-[.14em] text-rule lg:pl-5">
            11 – {TOP_N}
          </td>
        </tr>
      )}
      <tr
        className={`relative border-b border-paper/16 ${top ? "h-20" : "h-[66px]"} ${
          selected ? "bg-butter text-ink" : "hover:shadow-[inset_5px_0_0_var(--color-butter)]"
        }`}
      >
        <td className="pl-2 lg:pl-5">
          <span className="flex items-center gap-2">
            <span
              className={`font-display leading-none font-extrabold tabular-nums ${
                top ? `text-[40px] lg:text-[50px] ${selected ? "" : "text-butter"}` : "text-[26px] lg:text-[30px]"
              }`}
            >
              {row.rank}
            </span>
            {row.tied && (
              <span className="border border-current px-1 font-mono text-[10px] font-bold tracking-[.1em]">TIE</span>
            )}
          </span>
        </td>
        <td className="py-2 pr-2">
          {/* The button's ::after covers the whole row, so the row is one target. */}
          <button
            type="button"
            aria-pressed={selected}
            onClick={(e) => onOpen(row.ref, e.currentTarget)}
            className="text-left text-[17px] leading-tight font-semibold after:absolute after:inset-0 lg:text-[19px]"
          >
            {fullName(row)}
            <span className="sr-only">, open details</span>
          </button>
          <span className={`block text-[13px] lg:hidden ${selected ? "text-body" : "text-rule"}`}>
            {gradeText(row.grade)} · {row.homeroom}
          </span>
        </td>
        <td className="hidden font-display text-[26px] font-extrabold lg:table-cell">{row.grade ?? "—"}</td>
        <td className="hidden lg:table-cell">
          <span className="font-display text-[26px] leading-none font-extrabold">{row.homeroom}</span>
          <span className={`block text-[13px] ${selected ? "text-body" : "text-rule"}`}>{row.teacher}</span>
        </td>
        <td className="pr-2 text-right lg:pr-5">
          <span className="font-display text-[28px] leading-none font-black tabular-nums lg:text-[34px]">{fmt(row.total)}</span>
          <span className={`block text-[11.5px] whitespace-nowrap lg:text-[12.5px] ${selected ? "text-body" : "text-rule"}`}>
            {cansLabel(row.cans)} + {formatCents(row.cashCents)}
          </span>
        </td>
      </tr>
    </>
  );
}
