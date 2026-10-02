"use client";

import { Can } from "@/components/can";
import { MarkerUnderline } from "@/components/marks";
import { longDate, shortDate } from "@/lib/grade-wars/format";
import { fmt } from "@/lib/homepage";
import { TOP_N } from "@/lib/standings/build";
import { fullName, rankText, shelfLabel, tieNote, updatedLabel } from "@/lib/standings/format";
import type { StandingsData, StudentRef, TodayEntry } from "@/lib/standings/types";
import { WRAP } from "@/lib/site";

export type PageData = { kind: "ready"; data: StandingsData } | { kind: "loading" } | { kind: "error" };
export type OpenStudent = (ref: StudentRef, trigger: HTMLElement | null) => void;

// Can height shows the place, never the amount. Sizes are [phone, lg and up].
const PLACES = [
  {
    suffix: "ST",
    can: "h-[252px] w-[176px] lg:h-[330px] lg:w-[226px]",
    width: "w-[176px] lg:w-[226px]",
    body: "bg-butter",
    tag: "bg-butter",
    num: "text-[72px] lg:text-[92px]",
    ink: "",
    name: "text-[30px] lg:text-4xl",
    // Its own shelf on a phone; the middle of the one shelf on desktop.
    cell: "col-span-2 mb-7 lg:order-2 lg:col-span-1 lg:mb-0",
    align: "justify-start pl-4 lg:justify-center lg:pl-0",
    ledge: "mx-2.5 lg:mx-0",
  },
  {
    suffix: "ND",
    can: "h-[200px] w-[152px] lg:h-[262px] lg:w-[196px]",
    width: "w-[152px] lg:w-[196px]",
    body: "bg-paper",
    tag: "bg-field",
    num: "text-[52px] lg:text-[64px]",
    ink: "",
    name: "text-[26px] lg:text-3xl",
    cell: "lg:order-1",
    align: "justify-center",
    ledge: "ml-2.5",
  },
  {
    suffix: "RD",
    can: "h-[180px] w-[152px] lg:h-[222px] lg:w-[196px]",
    width: "w-[152px] lg:w-[196px]",
    body: "bg-tomato",
    tag: "bg-field",
    num: "text-[48px] lg:text-[60px]",
    ink: "text-white",
    name: "text-[26px] lg:text-3xl",
    cell: "lg:order-3",
    align: "justify-center",
    ledge: "mr-2.5",
  },
];

const CHIP = {
  live: "bg-butter text-ink",
  empty: "bg-kraft text-ink",
  loading: "bg-kraft text-ink",
  error: "bg-tomato text-white",
};

/**
 * "Today's shelf": the day's top three as cans on a pantry shelf, with today's
 * total on a shelf tag under each. Today only; it never reads the all-time ranking.
 */
export function TodayShelf({
  page,
  onOpen,
  onRetry,
  showOutsideNote = true,
}: {
  page: PageData;
  onOpen: OpenStudent;
  onRetry: () => void;
  /** The marker note beside a leader who isn't in the all-time top 25. */
  showOutsideNote?: boolean;
}) {
  const today = page.kind === "ready" ? page.data.today : null;
  const entries = today?.entries ?? [];
  const podium = entries.slice(0, 3);
  const behind = entries.slice(3);
  const state = page.kind !== "ready" ? page.kind : entries.length === 0 ? "empty" : "live";
  const leader = podium[0];
  const note =
    showOutsideNote && leader && leader.allTimeRank !== null && leader.allTimeRank > TOP_N
      ? `↙ #${leader.allTimeRank} all-time. Not in the top ${TOP_N}, yet!`
      : null;
  const tie = tieNote(podium);

  return (
    <section id="today" aria-labelledby="today-title" className="scroll-mt-36 border-b-2 border-ink bg-paper lg:scroll-mt-4">
      <div className={`${WRAP} flex flex-col gap-8 pb-11 lg:gap-12 lg:pb-24`}>
        <div className="flex flex-col gap-2 border-y-[3px] border-ink py-4 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className={`px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[.12em] whitespace-nowrap uppercase lg:text-xs ${CHIP[state]}`}>
              {state === "live" && <span aria-hidden>● </span>}
              {{ live: "Leading today", empty: "No donations yet", loading: "Loading…", error: "Unavailable" }[state]}
            </span>
            {today && (
              <p className="font-display text-xl leading-none font-extrabold uppercase lg:text-[28px]">{longDate(today.date)}</p>
            )}
          </div>
          {today && <p className="text-[15px] text-body">Day in progress; places can still change.</p>}
          {page.kind === "ready" && (
            <p className="font-mono text-xs text-muted lg:ml-auto">Updated {updatedLabel(page.data.generatedAt)}</p>
          )}
        </div>

        <div className="grid gap-9 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-end xl:gap-x-[72px]">
          <div className="flex flex-col gap-[18px] lg:gap-[22px]">
            <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
              01 · TODAY ONLY · RESETS AT MIDNIGHT
            </span>
            <h2
              id="today-title"
              className="font-display text-[clamp(3.25rem,16vw,4rem)] leading-[.84] font-black uppercase lg:text-[clamp(5rem,6.7vw,6rem)]"
            >
              Today’s <br />
              <MarkerUnderline strokeClassName="bottom-0 h-[13px] lg:h-[18px]">top donors</MarkerUnderline>
            </h2>
          </div>

          <div className="relative xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <ol className="grid grid-cols-2 lg:grid-cols-[1fr_1.15fr_1fr] lg:pt-16">
              {PLACES.map((p, i) => (
                <Spot key={p.suffix} place={i + 1} entry={podium[i]} note={i === 0 ? note : null} onOpen={onOpen} />
              ))}
            </ol>
            {state !== "live" && (
              <div
                role={state === "loading" ? "status" : undefined}
                className="absolute top-10 left-1/2 flex w-[min(400px,calc(100%-24px))] -translate-x-1/2 -rotate-2 flex-col items-start gap-2.5 border-[3px] border-ink bg-paper p-4 shadow-[8px_8px_0_var(--color-ink)] lg:top-24 lg:p-5"
              >
                {state === "empty" && (
                  <>
                    <p className="font-display text-2xl leading-none font-extrabold uppercase lg:text-[28px]">
                      The shelf’s empty, for now
                    </p>
                    <p className="text-[15px] text-body">
                      Nothing logged yet today ({shortDate(today!.date)}), so there’s no one to rank. The first donation
                      takes the top spot.
                    </p>
                  </>
                )}
                {state === "loading" && (
                  <p className="font-display text-2xl leading-none font-extrabold uppercase">Loading today’s donations…</p>
                )}
                {state === "error" && (
                  <>
                    <p className="font-display text-2xl leading-none font-extrabold uppercase lg:text-[28px]">
                      Today’s donations didn’t load
                    </p>
                    <p className="text-[15px] text-body">Nothing is missing from anyone’s record; we just couldn’t reach it.</p>
                    <button type="button" onClick={onRetry} className="h-11 bg-ink px-5 text-[15px] font-bold text-paper hover:bg-tomato">
                      Try again
                    </button>
                  </>
                )}
              </div>
            )}
            {tie && <p className="mt-5 max-w-[560px] text-sm text-body">{tie}</p>}
          </div>

          <CloseBehind entries={behind} onOpen={onOpen} />
        </div>
      </div>
    </section>
  );
}

function Spot({
  place,
  entry,
  note,
  onOpen,
}: {
  place: number;
  entry: TodayEntry | undefined;
  note: string | null;
  onOpen: OpenStudent;
}) {
  const p = PLACES[place - 1];
  return (
    <li className={`flex flex-col ${p.cell}`}>
      <div className={`relative flex flex-1 items-end gap-3 ${p.align}`}>
        {entry ? (
          <button
            type="button"
            aria-label={shelfLabel(entry)}
            onClick={(e) => onOpen(entry.ref, e.currentTarget)}
            className="flex-none transition-transform motion-safe:hover:-translate-y-1"
          >
            <Can variant="podium" ribs className={p.can} bodyClassName={p.body}>
              <div aria-hidden className={`absolute inset-x-0 top-3.5 flex items-baseline justify-center gap-0.5 lg:top-5 ${p.ink}`}>
                <span className={`font-display leading-[.9] font-black ${p.num}`}>{entry.rank}</span>
                <span className="font-display text-lg font-extrabold lg:text-2xl">{rankText(entry.rank).slice(-2).toUpperCase()}</span>
              </div>
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-3 flex flex-col gap-0.5 border-y-[3px] border-ink bg-paper px-1.5 py-2 text-center text-ink lg:bottom-[18px]"
              >
                <span className={`font-display leading-[.88] font-black break-words uppercase ${p.name}`}>{entry.firstName}</span>
                <span className="font-display text-[21px] leading-[.95] font-extrabold break-words lg:text-2xl">{entry.lastName}</span>
                <span className="pt-0.5 font-mono text-[11px] font-semibold tracking-[.06em]">
                  GR {entry.grade} · {entry.homeroom}
                </span>
              </div>
            </Can>
          </button>
        ) : (
          <div className={`relative flex-none ${p.can}`}>
            <div className="absolute inset-x-0 inset-y-[9px] flex items-end justify-center rounded-[10px] border-[3px] border-dashed border-dot pb-6 lg:inset-y-3 lg:rounded-[14px]">
              <span className="font-display text-xl font-extrabold text-muted uppercase lg:text-2xl">Open spot</span>
            </div>
          </div>
        )}
        {note && (
          <p className="mb-10 max-w-[150px] -rotate-4 font-marker text-lg leading-tight text-tomato lg:absolute lg:bottom-full lg:left-[58%] lg:mb-1 lg:w-[250px] lg:max-w-none lg:text-[22px]">
            {note}
          </p>
        )}
      </div>
      <div aria-hidden className="h-4 bg-ink" />
      <div className={`flex h-[90px] items-start border-b-[3px] border-ink bg-kraft lg:h-24 ${p.align} ${p.ledge}`}>
        <ShelfTag place={place} entry={entry} />
      </div>
    </li>
  );
}

/** The grocery shelf tag under a can: today's total, labelled "cans" like the homepage. */
function ShelfTag({ place, entry }: { place: number; entry: TodayEntry | undefined }) {
  const p = PLACES[place - 1];
  return (
    <div
      className={`-mt-0.5 flex h-[76px] flex-none flex-col justify-between border-[2.5px] px-2 py-1.5 lg:h-[86px] lg:px-2.5 ${p.width} ${
        entry ? `border-ink shadow-[4px_4px_0_var(--color-ink)] ${p.tag}` : "border-dashed border-dot bg-paper text-muted"
      }`}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold tracking-[.08em] whitespace-nowrap">
        <span>
          {entry ? `${rankText(entry.rank).toUpperCase()} · TODAY${entry.tied ? " · TIED" : ""}` : `${rankText(place).toUpperCase()} · TODAY`}
        </span>
        {entry && <span aria-hidden className="h-2.5 w-9 barcode" />}
      </div>
      {entry ? (
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[42px] leading-[.85] font-black tabular-nums lg:text-[52px]">{fmt(entry.total)}</span>
          <span className="font-display text-2xl leading-none font-extrabold uppercase lg:text-3xl">
            {entry.total === 1 ? "can" : "cans"}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <span aria-hidden className="font-display text-[42px] leading-[.85] font-black lg:text-[52px]">—</span>
          <span className="text-[13px] font-semibold">No one yet</span>
        </div>
      )}
    </div>
  );
}

function CloseBehind({ entries, onOpen }: { entries: TodayEntry[]; onOpen: OpenStudent }) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">CLOSE BEHIND</span>
      <ol className="flex flex-col border-t-2 border-ink">
        {entries.map((e) => (
          <li key={e.ref} className="border-b border-ink/15">
            <button
              type="button"
              onClick={(ev) => onOpen(e.ref, ev.currentTarget)}
              aria-label={`${e.tied ? "Tied " : ""}${rankText(e.rank)} today: ${fullName(e)}, homeroom ${e.homeroom}, ${fmt(e.total)} cans today. Open details.`}
              className="flex min-h-11 w-full items-baseline gap-2.5 py-2.5 text-left hover:bg-kraft lg:gap-3"
            >
              <span className="w-7 font-display text-[22px] leading-none font-black lg:w-8 lg:text-2xl">
                {String(e.rank).padStart(2, "0")}
              </span>
              <span className="text-[15px] font-semibold lg:text-base">{fullName(e)}</span>
              {e.tied && (
                <span className="border border-ink px-1 font-mono text-[10px] font-bold tracking-[.1em]">TIED</span>
              )}
              <span aria-hidden className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-dot" />
              <span className="text-[12.5px] text-muted lg:text-[13px]">{e.homeroom}</span>
              <span className="w-[34px] text-right font-display text-[22px] leading-none font-extrabold tabular-nums lg:w-11 lg:text-2xl">
                {fmt(e.total)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
