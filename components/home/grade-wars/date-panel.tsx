"use client";

import { useRef, type KeyboardEvent } from "react";
import { dayOfMonth, longDate, shortDate, weekdayShort } from "@/lib/grade-wars/format";
import type { CollectionDay } from "@/lib/grade-wars/types";

/**
 * Previous/next, one chip per day, and "back to latest". End-of-range buttons
 * use aria-disabled rather than `disabled`, so focus isn't dropped when a
 * press takes you to the end.
 */
export function DatePanel({
  days,
  selectedDayId,
  onSelect,
}: {
  days: CollectionDay[];
  selectedDayId: string | null;
  onSelect: (id: string) => void;
}) {
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const index = days.findIndex((d) => d.id === selectedDayId);
  const day = index === -1 ? null : days[index];
  const last = days.length - 1;
  const atStart = index <= 0;
  const atLatest = index === -1 || index === last;
  const position = day ? `${index + 1} OF ${days.length}${atLatest ? " · LATEST" : ""}` : "";

  function go(i: number, focus = false) {
    const target = days[Math.max(0, Math.min(last, i))];
    if (!target || i === index) return;
    onSelect(target.id);
    if (focus) chips.current[days.indexOf(target)]?.focus();
  }

  function onChipKey(e: KeyboardEvent) {
    const to = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to, true);
  }

  const arrow =
    "flex size-[52px] flex-none items-center justify-center border-2 border-paper font-display text-2xl font-black aria-disabled:opacity-35 lg:size-14";

  return (
    <div className="flex flex-col gap-4 bg-ink p-4 text-paper shadow-[8px_8px_0_var(--color-butter)] lg:gap-5 lg:p-6">
      <div className="hidden items-center justify-between gap-4 lg:flex">
        <span className="font-mono text-xs font-semibold tracking-[.14em] text-rule">
          COLLECTION DAY{position && ` · ${position}`}
        </span>
        <BackToLatest
          atLatest={atLatest}
          onClick={() => go(last)}
          className={`text-sm ${atLatest ? "" : "underline decoration-2 underline-offset-4"}`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous day"
          aria-disabled={atStart}
          onClick={() => !atStart && go(index - 1)}
          className={arrow}
        >
          <span aria-hidden>←</span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-rule lg:hidden">
            {position ? `DAY ${position}` : " "}
          </span>
          <span className="font-display text-[38px] leading-[.9] font-black whitespace-nowrap text-butter uppercase lg:text-[64px]">
            {day ? shortDate(day.date) : "—"}
          </span>
        </div>
        <button
          type="button"
          aria-label="Next day"
          aria-disabled={atLatest}
          onClick={() => !atLatest && go(index + 1)}
          className={arrow}
        >
          <span aria-hidden>→</span>
        </button>
      </div>

      <div role="group" aria-label="Collection days" onKeyDown={onChipKey} className="flex h-[52px] gap-2 lg:h-[58px]">
        {days.map((d, i) => {
          const selected = d.id === selectedDayId;
          return (
            <button
              key={d.id}
              ref={(el) => {
                chips.current[i] = el;
              }}
              type="button"
              tabIndex={selected ? 0 : -1}
              aria-pressed={selected}
              aria-label={`${longDate(d.date)}${i === last ? " (latest)" : ""}`}
              onClick={() => go(i)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-2 ${
                selected ? "border-butter bg-butter text-ink" : "border-paper/35 hover:border-paper"
              }`}
            >
              <span className="font-mono text-[10px] font-semibold tracking-[.12em] lg:text-[11px]">
                {weekdayShort(d.date)}
              </span>
              <span className="font-display text-xl leading-none font-black lg:text-2xl">{dayOfMonth(d.date)}</span>
            </button>
          );
        })}
      </div>

      <BackToLatest
        atLatest={atLatest}
        onClick={() => go(last)}
        className="h-11 justify-center border-2 border-current text-[15px] lg:hidden"
      />
    </div>
  );
}

function BackToLatest({
  atLatest,
  onClick,
  className,
}: {
  atLatest: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-disabled={atLatest}
      onClick={() => !atLatest && onClick()}
      className={`flex items-center font-semibold ${
atLatest ? "text-rule" : "text-butter"} ${className}`}
    >
      {atLatest ? "Showing latest day" : "Back to latest day →"}
    </button>
  );
}
