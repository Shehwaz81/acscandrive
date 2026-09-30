"use client";

import { useMemo, useState } from "react";
import { longDate, shortDate } from "@/lib/grade-wars/format";
import { PrecomputedGradeWarsRepository } from "@/lib/grade-wars/precomputed";
import type { GradeWarsRepository } from "@/lib/grade-wars/repository";
import type { GradeWarsData } from "@/lib/grade-wars/types";
import { useGradeWars } from "@/lib/grade-wars/use-grade-wars";
import { type Board, announcement, boardFor, statusText } from "@/lib/grade-wars/view";
import { WRAP } from "@/lib/site";
import { Breakdown } from "./breakdown";
import { DatePanel } from "./date-panel";
import { Podium } from "./podium";

const CHIP: Record<Board["kind"] | "live", string> = {
  ranked: "bg-ink text-paper",
  live: "bg-butter text-ink",
  empty: "bg-kraft text-ink",
  loading: "bg-kraft text-ink",
  error: "bg-tomato text-white",
  upcoming: "bg-kraft text-ink",
};

/** Each collection day's ranking of Grades 9–12. Daily only; overall totals are The Standings. */
export function GradeWars({
  data,
  repository,
}: {
  /** From `getHomepageData()`. */
  data: GradeWarsData;
  /** Tests inject their own instead. */
  repository?: GradeWarsRepository;
}) {
  const repo = useMemo(() => repository ?? new PrecomputedGradeWarsRepository(data), [repository, data]);
  const { days, selectedDayId, setSelectedDayId, result, status, retry } = useGradeWars(repo);
  // Announce only after the visitor acts, not on page load.
  const [interacted, setInteracted] = useState(false);

  const board = boardFor(status, result);
  const day = days.find((d) => d.id === selectedDayId) ?? null;
  const date = day?.date ?? null;
  const { chip, card } = statusText(board);
  const live = board.kind === "ranked" && board.live;

  function select(id: string) {
    setInteracted(true);
    setSelectedDayId(id);
  }

  return (
    <section id="grade-wars" aria-labelledby="grade-wars-title" className="scroll-mt-4 border-b-2 border-ink bg-paper">
      <div className={`${WRAP} flex flex-col gap-8 pt-10 pb-11 lg:gap-12 lg:pt-[88px] lg:pb-24`}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-end xl:gap-16">
          <div className="flex flex-col gap-3 lg:gap-4">
            <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
              DAILY GRADE TABLE
            </span>
            <h2
              id="grade-wars-title"
              className="font-display text-[clamp(4.5rem,26vw,6rem)] leading-[.8] font-black uppercase lg:text-[clamp(7rem,12vw,10.5rem)]"
            >
              Grade
              <br />
              <span className="text-tomato">Wars</span>
            </h2>
            <p className="mt-1 font-display text-xl leading-none font-extrabold uppercase lg:text-[30px]">
              Four grades. One daily showdown.
            </p>
          </div>
          <DatePanel days={days} selectedDayId={selectedDayId} onSelect={select} />
        </div>

        <div className="flex flex-col gap-2 border-y-[3px] border-ink py-4 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[.12em] whitespace-nowrap uppercase lg:text-xs ${CHIP[live ? "live" : board.kind]}`}
            >
              {live && <span aria-hidden>● </span>}
              {chip}
            </span>
            <p className="font-display text-xl leading-none font-extrabold uppercase lg:text-[28px]">
              {date ? (
                <>
                  Ranking for <span className="lg:hidden">{shortDate(date)}</span>
                  <span className="hidden lg:inline">{longDate(date)}</span> only
                </>
              ) : (
                "Ranking for one day only"
              )}
            </p>
          </div>
          <p className="text-sm text-body lg:ml-auto lg:text-right">
            One day’s donations only. For overall drive totals, see{" "}
            <a href="#standings" className="inline-flex min-h-11 items-center font-semibold underline lg:min-h-0">
              The standings&nbsp;<span aria-hidden>↑</span>
            </a>
          </p>
        </div>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] xl:items-end xl:gap-12">
          <div className="relative">
            <Podium board={board} />
            {card && (
              <div
                role={board.kind === "loading" ? "status" : undefined}
                className="absolute top-0 left-1/2 flex w-[min(420px,calc(100%-8px))] -translate-x-1/2 flex-col items-start gap-3 border-[3px] border-ink bg-paper p-4 shadow-[8px_8px_0_var(--color-ink)] lg:top-6 lg:p-5 xl:left-[min(50%,400px)]"
              >
                <p className="font-display text-xl leading-tight font-extrabold uppercase lg:text-2xl">{card}</p>
                {board.kind === "error" && (
                  <button
                    type="button"
                    onClick={() => {
                      setInteracted(true);
                      retry();
                    }}
                    className="h-11 bg-ink px-5 text-[15px] font-bold text-paper hover:bg-tomato"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
          <Breakdown board={board} date={date} />
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {interacted ? announcement(board, date) : ""}
      </p>
    </section>
  );
}
