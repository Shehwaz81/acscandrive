import type { CSSProperties } from "react";
import { Stamp } from "@/components/marks";
import { fmt, ordinalSuffix } from "@/lib/homepage";
import type { Rank } from "@/lib/grade-wars/rank";
import { type Board, leadNote, tagFor } from "@/lib/grade-wars/view";
import { GRADES, type Grade } from "@/lib/grade-wars/types";
import { GradeTag } from "./tag";

/** Can body / label band per place. Tied grades share a place, so share colours. */
const COLOURS: Record<Rank, { body: string; band: string }> = {
  1: { body: "bg-butter", band: "bg-paper text-ink" },
  2: { body: "bg-paper", band: "bg-tomato text-white" },
  3: { body: "bg-tomato", band: "bg-paper text-ink" },
  4: { body: "bg-rule", band: "bg-paper text-ink" },
};

/**
 * Desktop left offsets, as a share of the 800px design width so the podium
 * also fits the narrower xl column: display position 0 (the leader) stands
 * in the middle, then 2nd on the left, 3rd on the right, 4th set apart.
 */
const DESKTOP_LEFT = ["24.75%", "0%", "49.5%", "78%"];
/** Placeholder stacks stand in grade order. */
const DESKTOP_LEFT_LINEAR = ["0%", "24.75%", "49.5%", "78%"];

const MOTION = "duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none";

type Column = {
  grade: Grade;
  /** Position in display order (0 = first listed). */
  index: number;
  desktopLeft: string;
  rank: Rank | null;
  total: string;
  rows: number;
  placeholder: boolean;
  tag: ReturnType<typeof tagFor>;
  note: ReturnType<typeof leadNote> | null;
};

function columnsFor(board: Board): Column[] {
  if (board.kind !== "ranked") {
    return GRADES.map((grade, index) => ({
      grade,
      index,
      desktopLeft: DESKTOP_LEFT_LINEAR[index],
      rank: null,
      total: board.kind === "empty" ? "0" : "—",
      rows: 1,
      placeholder: true,
      tag: null,
      note: null,
    }));
  }
  return board.ranked.map((g, index) => ({
    grade: g.grade,
    index,
    desktopLeft: DESKTOP_LEFT[index],
    rank: g.rank,
    total: fmt(g.total),
    // Height is place, not amount: 1st gets 4 rows, 4th gets 1.
    rows: 5 - g.rank,
    placeholder: false,
    tag: tagFor(g, board.live),
    note: index === 0 ? leadNote(board.ranked, board.live) : null,
  }));
}

/** Decorative: the breakdown list is the accessible ranking. */
export function Podium({ board, demo }: { board: Board; demo: boolean }) {
  const columns = columnsFor(board);
  const mobileNote = columns[0].note?.mobile;
  return (
    <div aria-hidden className="w-full max-w-[800px]">
      <div className="relative h-[330px] lg:h-[540px]">
        {demo && (
          <span className="absolute top-0 right-0 hidden lg:block">
            <Stamp className="rotate-6 border-tomato px-2.5 py-1 text-[12px] text-tomato">DEMO DATA</Stamp>
          </span>
        )}
        {mobileNote && (
          <span className="absolute top-1 right-0 max-w-[46%] -rotate-5 text-right font-marker text-lg leading-[1.15] text-tomato lg:hidden">
            {mobileNote}
          </span>
        )}
        {/* Keyed by grade, so a grade's column slides to its new place. */}
        {columns.map((c) => (
          <PodiumColumn key={c.grade} column={c} />
        ))}
      </div>
      <div className="h-1.5 bg-ink lg:h-2" />
      <div className="flex justify-between pt-2 font-mono text-[10.5px] font-semibold tracking-[.1em] text-muted lg:pt-2.5 lg:text-[11.5px] lg:tracking-[.12em]">
        <span>
          <span className="hidden lg:inline">STACK </span>HEIGHT = PLACE, NOT AMOUNT
        </span>
        <span className="hidden lg:inline">TOTALS IN CAN-EQUIVALENTS</span>
        <span className="lg:hidden">{demo ? "DEMO DATA" : "CAN-EQUIVALENTS"}</span>
      </div>
    </div>
  );
}

function PodiumColumn({ column: c }: { column: Column }) {
  const leader = c.rank === 1;
  const colours = c.rank ? COLOURS[c.rank] : null;
  const style = { "--i": c.index, "--dl": c.desktopLeft, "--rows": c.rows } as CSSProperties;
  return (
    <div
      style={style}
      className={`absolute bottom-0 flex w-[calc((100%_-_30px)/4)] flex-col items-center gap-2 transition-[left] lg:w-[22%] lg:gap-3 left-[calc(var(--i)*((100%_-_30px)/4_+_10px))] lg:left-(--dl) ${MOTION}`}
    >
      <div className="relative flex flex-col items-center text-center">
        {c.note && (
          <span className="absolute top-1 left-full ml-3 hidden -rotate-5 font-marker text-[22px] leading-none whitespace-nowrap text-tomato lg:block">
            {c.note.desktop}
          </span>
        )}
        <span className="font-display text-2xl leading-none font-black lg:text-[44px]">
          {c.rank ? (
            <>
              {c.rank}
              <span className="text-[.55em] uppercase">{ordinalSuffix(c.rank)}</span>
            </>
          ) : (
            "—"
          )}
        </span>
        {/* Tags live in the breakdown only on phones. */}
        {c.tag && (
          <span className="mt-1.5 hidden lg:block">
            <GradeTag {...c.tag} />
          </span>
        )}
        <span className="mt-1 font-mono text-[10px] font-semibold tracking-[.14em] text-muted lg:mt-2 lg:text-xs">
          GRADE
        </span>
        <span
          className={`font-display leading-[.8] font-black transition-[font-size] ${MOTION} ${
            leader ? "text-[60px] lg:text-[116px]" : "text-[46px] lg:text-[84px]"
          }`}
        >
          {c.grade}
        </span>
        <span className="mt-1.5 font-display text-2xl leading-none font-extrabold lg:mt-2 lg:text-[30px]">
          {c.total}
        </span>
        <span className="text-[11px] text-body lg:text-[13px]">
          <span className="lg:hidden">can-eq.</span>
          <span className="hidden lg:inline">can-equivalents</span>
        </span>
      </div>
      <div
        className={`flex h-[calc(var(--rows)*36px)] w-full flex-col justify-end overflow-hidden transition-[height] lg:h-[calc(var(--rows)*62px)] ${MOTION}`}
      >
        {Array.from({ length: c.placeholder ? 1 : 4 }, (_, i) => (
          <Course key={i} grade={c.grade} colours={colours} />
        ))}
      </div>
    </div>
  );
}

/** One row of cans: two on phones, three on desktop. `colours` null = dashed placeholder. */
function Course({ grade, colours }: { grade: Grade; colours: { body: string; band: string } | null }) {
  return (
    <div className="flex h-9 flex-none gap-1 pt-[3px] lg:h-[62px] lg:gap-1.5 lg:pt-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`relative flex-1 rounded-[5px] border-2 border-ink lg:rounded-[7px] lg:border-[3px] ${
            i === 2 ? "hidden lg:block" : ""
          } ${
            colours
              ? `${colours.body} can-ridges shadow-[inset_0_4px_0_rgb(27_26_23/.14),inset_0_-4px_0_rgb(27_26_23/.14)]`
              : "border-dashed bg-transparent"
          }`}
        >
          {colours && (
            <span
              className={`absolute inset-x-0 top-1/2 flex h-3 -translate-y-1/2 items-center justify-center border-y-2 border-ink font-mono text-[9px] leading-none font-bold tracking-[.06em] lg:h-[22px] ${colours.band}`}
            >
              <span className="hidden lg:inline">GR {grade}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
