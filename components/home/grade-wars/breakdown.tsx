import { fmt } from "@/lib/homepage";
import { cashLabel, longDate, shortDate } from "@/lib/grade-wars/format";
import { GRADES } from "@/lib/grade-wars/types";
import { type Board, rankText, tagFor } from "@/lib/grade-wars/view";
import { GradeTag } from "./tag";

const PLACEHOLDER_LINE = { empty: "No donations recorded", loading: "Loading…", error: "Unavailable" };

/** The accessible ranking: four rows in rank order (grade order when there is none). */
export function Breakdown({ board, date }: { board: Board; date: string | null }) {
  const rows =
    board.kind === "ranked"
      ? board.ranked.map((g) => ({
          grade: g.grade,
          rank: rankText(g.rank),
          tag: tagFor(g, board.live),
          total: fmt(g.total),
          line: `${fmt(g.cans)} cans + ${cashLabel(g.cashCents)} cash`,
          share: g.share,
          leader: g.rank === 1,
        }))
      : GRADES.map((grade) => ({
          grade,
          rank: "—",
          tag: null,
          total: board.kind === "empty" ? "0" : "—",
          line: PLACEHOLDER_LINE[board.kind],
          share: null,
          leader: false,
        }));
  const dayTotal = board.kind === "ranked" ? fmt(board.dayTotal) : board.kind === "empty" ? "0" : "—";

  return (
    <div className="flex flex-col">
      <div className="flex justify-between gap-3 border-b-4 border-ink pb-2 font-mono text-[10px] font-semibold tracking-[.08em] whitespace-nowrap text-muted min-[390px]:text-[11px] lg:text-xs lg:tracking-[.12em]">
        <span>ALL FOUR GRADES{date && ` · ${shortDate(date).toUpperCase()}`}</span>
        <span>CAN-EQ.</span>
      </div>
      <ol aria-label={`Grade ranking${date ? ` for ${longDate(date)}` : ""}`}>
        {rows.map((r) => (
          <li
            key={r.grade}
            className="grid min-h-[76px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 border-b border-ink/25 py-3 lg:grid-cols-[52px_minmax(0,1fr)_auto]"
          >
            <span className="font-display text-xl leading-none font-black lg:text-2xl">{r.rank}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display text-2xl leading-none font-extrabold uppercase lg:text-[26px]">
                Grade {r.grade}
              </span>
              {r.tag && <GradeTag {...r.tag} />}
            </span>
            <span className="text-right font-display text-[26px] leading-none font-black lg:text-[30px]">
              {r.total}
              <span className="sr-only"> can-equivalents</span>
            </span>
            <span className="col-span-2 col-start-2 flex items-center gap-3 text-[13px] text-body">
              <span className="flex-none">{r.line}</span>
              {r.share !== null && (
                <>
                  <span aria-hidden className="h-1.5 min-w-6 flex-1 bg-kraft">
                    <span
                      className={`block h-full ${r.leader ? "bg-tomato" : "bg-ink"}`}
                      style={{ width: `${r.share}%` }}
                    />
                  </span>
                  <span className="w-9 flex-none text-right font-mono text-xs font-semibold">{r.share}%</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-end justify-between gap-4 border-y-4 border-ink py-3">
        <span className="text-[15px] font-semibold">Daily school total</span>
        <span className="flex flex-col items-end">
          <span className="font-display text-[44px] leading-[.85] font-black lg:text-[60px]">{dayTotal}</span>
          <span className="text-xs text-body">can-equivalents</span>
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-normal text-body">
        Cans count one-for-one; cash counts $1 = 1 can-equivalent. Any daily recognition for the top grade is still
        being confirmed.
      </p>
    </div>
  );
}
