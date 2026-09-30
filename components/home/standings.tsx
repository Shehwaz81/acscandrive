"use client";

import { useState } from "react";
import { Can } from "@/components/can";
import {
  type Homeroom,
  fmt,
  gradeLabel,
  homeroomStats,
  matchesQuery,
  ordinalSuffix,
} from "@/lib/homepage";
import { WRAP } from "@/lib/site";

const TOP_N = 8;
const QUALIFY_NOTE =
  "The first 20 homerooms to hit their target play.";

export function Standings({ homerooms }: { homerooms: Homeroom[] }) {
  const [query, setQuery] = useState("");
  // Start on the leader so the desktop card matches a visible row.
  const [selected, setSelected] = useState<string | null>(homerooms[0]?.room ?? null);
  const [showAll, setShowAll] = useState(false);

  const ranked = homerooms.map((h, i) => ({ ...h, rank: i + 1 }));
  const leaderTotal = Math.max(1, homerooms[0]?.total ?? 0);
  const rows = query
    ? ranked.filter((h) => matchesQuery(h, query))
    : showAll
      ? ranked
      : ranked.slice(0, TOP_N);
  // Desktop always shows a card; fall back to the leader if nothing is selected.
  const detail = ranked.find((h) => h.room === selected) ?? ranked[0];

  const countText = query
    ? `${rows.length} match${rows.length === 1 ? "" : "es"}.`
    : `Showing ${rows.length} of ${ranked.length} homerooms.`;

  function onRowClick(room: string) {
    // On mobile the row is an accordion, so a second tap collapses it.
    // On desktop the side card always shows a selection.
    const isDesktop = window.matchMedia("(min-width: 1280px)").matches;
    setSelected((cur) => (cur === room && !isDesktop ? null : room));
  }

  return (
    <section
      id="standings"
      aria-labelledby="standings-title"
      className="scroll-mt-4 bg-ink text-paper"
    >
      <div className={`${WRAP} flex flex-col gap-[18px] pt-10 pb-11 xl:gap-10 xl:pt-20 xl:pb-[88px]`}>
        <div className="flex flex-col gap-[18px] xl:flex-row xl:items-end xl:justify-between xl:gap-10">
          <div className="flex flex-col gap-[18px] xl:gap-3.5">
            <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-butter xl:text-xs">
              HOMEROOM TABLE · CAN-EQUIVALENTS
            </span>
            <h2
              id="standings-title"
              className="font-display text-[clamp(3.25rem,16vw,4rem)] leading-[.84] font-black uppercase xl:text-[clamp(5rem,7.2vw,6.5rem)]"
            >
              The standings
            </h2>
          </div>
          <label className="flex flex-col gap-2 xl:w-[360px] xl:flex-none">
            <span className="text-sm font-semibold">Find your homeroom</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 204 or grade 9"
              className="h-[52px] w-full min-w-0 bg-paper px-3.5 text-[17px] text-ink shadow-[inset_0_-4px_0_var(--color-butter)] placeholder:text-muted focus-visible:shadow-[inset_0_-4px_0_var(--color-tomato),0_0_0_3px_var(--color-butter)] focus-visible:outline-none xl:px-4"
            />
          </label>
        </div>

        <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col">
            <div
              aria-hidden
              className="hidden grid-cols-[96px_minmax(0,1fr)_170px_220px] gap-4 border-b-2 border-paper px-5 pb-3 font-mono text-[11.5px] font-semibold tracking-[.1em] text-rule xl:grid"
            >
              <span>RANK</span>
              <span>HOMEROOM</span>
              <span>GRADES</span>
              <span className="text-right">CAN-EQUIVALENTS</span>
            </div>
            <ul className="border-t-2 border-paper xl:border-t-0">
              {rows.map((h) => (
                <li key={h.room} className="border-b border-paper/20">
                  <Row
                    h={h}
                    leaderTotal={leaderTotal}
                    selected={h.room === selected}
                    onClick={() => onRowClick(h.room)}
                  />
                  {h.room === selected && <InlineDetail h={h} />}
                </li>
              ))}
            </ul>
            <p aria-live="polite" className="text-[13.5px] text-rule">
              {rows.length === 0 && (
                <span className="block px-1 py-5 text-[15px] xl:px-5 xl:py-7 xl:text-base">
                  No homeroom matches “{query}”. Check the code on your timetable.
                </span>
              )}
            </p>
            <div className="flex flex-col gap-[18px] pt-[18px] xl:flex-row xl:items-center xl:justify-between xl:gap-5 xl:pt-5">
              <span className="text-[13px] text-rule xl:text-[13.5px]">
                {countText}
                <span className="xl:hidden"> Tap a homeroom to see its target.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAll((s) => !s);
                  setQuery("");
                }}
                className="h-[52px] border-2 border-paper px-5 text-[15px] font-bold hover:bg-paper hover:text-ink xl:h-auto xl:py-3"
              >
                {showAll ? `Show top ${TOP_N}` : "View full standings"}
              </button>
            </div>
          </div>

          {detail && <DetailCard h={detail} />}
        </div>
      </div>
    </section>
  );
}

type Ranked = Homeroom & { rank: number };

function Row({
  h,
  leaderTotal,
  selected,
  onClick,
}: {
  h: Ranked;
  leaderTotal: number;
  selected: boolean;
  onClick: () => void;
}) {
  // No leader until someone has donated.
  const leader = h.rank === 1 && h.total > 0;
  const fg = selected ? "text-ink" : leader ? "text-butter" : "text-paper";
  const bar = selected ? "bg-ink" : leader ? "bg-butter" : "bg-paper";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${h.room}, ${gradeLabel(h)}, rank ${h.rank}, ${fmt(h.total)} can-equivalents`}
      className={`grid min-h-[60px] w-full grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left xl:min-h-16 xl:grid-cols-[96px_minmax(0,1fr)_170px_220px] xl:gap-4 xl:px-5 xl:py-3 ${fg} ${selected ? "bg-butter" : "hover:bg-paper/5"}`}
    >
      <span className="flex items-baseline gap-0.5 xl:gap-1">
        <span className="font-display text-[32px] leading-none font-black xl:text-[40px]">
          {String(h.rank).padStart(2, "0")}
        </span>
        <span className="text-[11px] font-bold xl:text-[13px]">{ordinalSuffix(h.rank)}</span>
      </span>
      <span className="flex flex-col gap-0.5 xl:flex-row xl:items-center xl:gap-3">
        <span className="font-display text-2xl leading-none font-extrabold xl:text-[28px]">{h.room}</span>
        <span className="text-[12.5px] xl:text-[13px] xl:font-semibold">
          <span className="xl:hidden">
            {gradeLabel(h)}
            {leader && " · "}
          </span>
          {leader && (
            <span className="xl:border xl:border-current xl:px-1.5 xl:py-0.5 xl:font-mono xl:text-[11px] xl:tracking-[.1em] xl:uppercase">
              Leader
            </span>
          )}
        </span>
      </span>
      <span className="hidden text-base xl:block">{gradeLabel(h)}</span>
      <span className="flex flex-col items-end xl:flex-row xl:items-center xl:justify-end xl:gap-3.5">
        <span className="hidden h-2 w-[110px] bg-[rgb(127_127_127/.3)] xl:block">
          <span className={`block h-full ${bar}`} style={{ width: `${Math.round((h.total / leaderTotal) * 100)}%` }} />
        </span>
        <span className="font-display text-2xl leading-none font-extrabold xl:min-w-16 xl:text-right xl:text-[26px]">
          {fmt(h.total)}
        </span>
        <span className="text-[11px] xl:hidden">can-eq. {selected ? "▴" : "▾"}</span>
      </span>
    </button>
  );
}

function ProgressBar({ pct, className }: { pct: number; className: string }) {
  return (
    <div className={`border-2 border-ink bg-kraft ${className}`}>
      <div className="h-full progress-stripes" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Mobile: expands under the tapped row. */
function InlineDetail({ h }: { h: Ranked }) {
  const s = homeroomStats(h);
  return (
    <div className="flex flex-col gap-2.5 bg-paper px-4 pt-4 pb-[18px] text-ink xl:hidden">
      <span className="text-[13px] font-semibold">
        Dodgeball target · {h.students} students × 10
      </span>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[40px] leading-none font-black">{fmt(h.total)}</span>
        <span className="text-[15px]">
          of {fmt(s.target)} ({s.pct}%)
        </span>
      </div>
      <ProgressBar pct={s.pct} className="h-3" />
      <span className="text-[13px] text-body">{s.split}</span>
      <span className="font-display text-xl leading-[1.1] font-extrabold uppercase">{s.status}</span>
      <span className="text-[12.5px] leading-[1.45] text-body">{QUALIFY_NOTE}</span>
    </div>
  );
}

/** Desktop: the pinned "selected homeroom" card. */
function DetailCard({ h }: { h: Ranked }) {
  const s = homeroomStats(h);
  return (
    <div
      aria-live="polite"
      className="hidden rotate-1 flex-col gap-[22px] bg-paper p-8 text-ink xl:flex"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11.5px] font-semibold tracking-[.12em] text-muted">
            SELECTED HOMEROOM
          </span>
          <span className="font-display text-[88px] leading-[.8] font-black">{h.room}</span>
          <span className="text-[15px]">
            {gradeLabel(h)} · Rank {h.rank} · {h.students} students
          </span>
        </div>
        <Can variant="meter" fill={s.pct} className="h-[118px] w-[84px]" bodyClassName="bg-transparent" />
      </div>
      <div className="flex flex-col gap-2.5 border-t-2 border-ink pt-[18px]">
        <span className="text-sm font-semibold">Dodgeball target</span>
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[52px] leading-none font-black">{fmt(h.total)}</span>
          <span className="text-[17px]">
            of {fmt(s.target)} ({s.pct}%)
          </span>
        </div>
        <ProgressBar pct={s.pct} className="h-3.5" />
        <span className="text-sm text-body">
          {h.students} students × 10 = {fmt(s.target)} · {s.split}
        </span>
      </div>
      <div className="flex flex-col gap-1 bg-kraft px-4 py-3.5">
        <span className="font-display text-2xl leading-[1.1] font-extrabold uppercase">{s.status}</span>
        <span className="text-[13.5px] leading-[1.45] text-body">{QUALIFY_NOTE}</span>
      </div>
    </div>
  );
}
