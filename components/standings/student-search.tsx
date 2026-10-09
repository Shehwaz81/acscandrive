"use client";

import { type KeyboardEvent, type RefObject, useId, useState } from "react";
import { fmt } from "@/lib/homepage";
import { MIN_QUERY } from "@/lib/standings/build";
import { fullName } from "@/lib/standings/format";
import type { SearchStatus } from "@/lib/standings/use-student-search";
import type { SearchItem, SearchResult, StudentRef } from "@/lib/standings/types";
import { gradeText } from "@/lib/volunteer/types";

export type SearchProps = {
  query: string;
  onQueryChange: (q: string) => void;
  status: SearchStatus;
  result: SearchResult | null;
  onRetry: () => void;
  /** Opens the student; the input is the element focus returns to. */
  onOpen: (ref: StudentRef, trigger: HTMLElement | null) => void;
};

const SIZES = {
  /** Desktop: in the ink "Find a student" card. */
  card: {
    input: "h-[60px] pr-[92px] pl-4 text-lg",
    panel: "shadow-[8px_8px_0_var(--color-ink)]",
  },
  /** Phone: the sticky bar under the header. */
  bar: {
    input: "h-[50px] pr-[84px] pl-3.5 text-base",
    panel: "shadow-[5px_5px_0_var(--color-ink)]",
  },
};

/**
 * "Find a student": a combobox over the whole roster. The query and results
 * live in the page, so the desktop card and the phone bar stay in step.
 */
export function StudentSearch({
  variant,
  inputRef,
  labelledBy,
  query,
  onQueryChange,
  status,
  result,
  onRetry,
  onOpen,
}: SearchProps & {
  variant: keyof typeof SIZES;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Id of a visible label; without one the input is labelled "Find a student". */
  labelledBy?: string;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // The active option belongs to one query; a new query starts at the top again.
  const [active, setActive] = useState({ query: "", index: 0 });
  const size = SIZES[variant];

  const q = query.trim();
  const tooShort = q.length > 0 && q.replace(/\s/g, "").length < MIN_QUERY;
  const open = focused && !dismissed && q.length > 0;
  const items = result?.items ?? [];
  const index = active.query === q ? Math.min(active.index, Math.max(items.length - 1, 0)) : 0;
  const optionId = (i: number) => `${id}-option-${i}`;
  const firstSimilar = items.findIndex((i) => i.similar);

  function change(value: string) {
    setDismissed(false);
    onQueryChange(value);
  }

  function clear() {
    onQueryChange("");
    inputRef.current?.focus();
  }

  function choose(item: SearchItem) {
    setDismissed(true);
    onOpen(item.ref, inputRef.current);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) e.preventDefault();
      onQueryChange("");
      setDismissed(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setDismissed(false);
      if (items.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive({ query: q, index: (index + step + items.length) % items.length });
    } else if (e.key === "Enter" && open && items[index]) {
      e.preventDefault();
      choose(items[index]);
    }
  }

  return (
    <div className="relative text-ink">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && items[index] ? optionId(index) : undefined}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : "Find a student"}
        autoComplete="off"
        spellCheck={false}
        maxLength={100}
        placeholder="Type a first or last name"
        value={query}
        onChange={(e) => change(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          setFocused(true);
          setDismissed(false);
        }}
        onBlur={() => setFocused(false)}
        className={`w-full bg-paper font-semibold shadow-[inset_0_-4px_0_var(--color-butter)] placeholder:font-normal placeholder:text-muted focus:shadow-[inset_0_-4px_0_var(--color-tomato)] ${size.input}`}
      />
      {query && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clear}
          className="absolute inset-y-0 right-0 min-w-11 px-3.5 text-sm font-bold whitespace-nowrap hover:text-tomato"
        >
          Clear <span aria-hidden>✕</span>
        </button>
      )}

      <div
        hidden={!open}
        // Keeps focus in the input, so a click on anything here lands before blur closes it.
        onMouseDown={(e) => e.preventDefault()}
        className={`absolute inset-x-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto border-[3px] border-ink bg-paper ${size.panel}`}
      >
        {status === "ready" && items.length > 0 && (
          <div className="flex justify-between gap-3 border-b-2 border-ink px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[.1em] text-muted">
            <span>
              {fmt(result!.total)} {result!.total === 1 ? "STUDENT" : "STUDENTS"} · WHOLE ROSTER
            </span>
            <span>ALL-TIME</span>
          </div>
        )}
        <ul id={`${id}-list`} role="listbox" aria-label="Students">
          {status === "ready" &&
            items.map((item, i) => (
              <Option
                key={item.ref}
                id={optionId(i)}
                item={item}
                active={i === index}
                heading={i === firstSimilar ? "Similar spelling" : null}
                onHover={() => setActive({ query: q, index: i })}
                onChoose={() => choose(item)}
              />
            ))}
        </ul>

        {tooShort && <p className="px-3.5 py-4 text-[15px] text-body">Keep typing: at least {MIN_QUERY} letters.</p>}
        {status === "loading" && (
          <p role="status" className="px-3.5 py-4 text-[15px] text-body">
            Searching…
          </p>
        )}
        {status === "error" && (
          <div className="flex flex-col items-start gap-3 px-3.5 py-4">
            <p className="text-[15px] font-semibold text-error">The search didn’t load. Nothing was found or ruled out.</p>
            <button type="button" onClick={onRetry} className="h-11 bg-ink px-5 text-[15px] font-bold text-paper hover:bg-tomato">
              Try again
            </button>
          </div>
        )}
        {status === "ready" && items.length === 0 && (
          <div className="flex flex-col items-start gap-2 px-3.5 py-4">
            <p className="font-display text-2xl leading-none font-extrabold uppercase">No student matches “{q}”</p>
            <p className="text-[15px] text-body">Check the spelling, or try just a first or last name.</p>
            <button type="button" onClick={clear} className="mt-1 h-11 border-2 border-ink px-5 text-[15px] font-bold hover:bg-ink hover:text-paper">
              Clear search
            </button>
          </div>
        )}
        {status === "ready" && result!.total > items.length && (
          <p className="border-t border-ink/15 px-3.5 py-3 text-sm text-body">
            {fmt(result!.total - items.length)} more; keep typing to narrow it down.
          </p>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {open ? announcement(status, result, q) : ""}
      </p>
    </div>
  );
}

function announcement(status: SearchStatus, result: SearchResult | null, q: string): string {
  if (status === "error") return "The search didn’t load.";
  if (status !== "ready" || !result) return "";
  if (result.items.length === 0) return `No student matches ${q}.`;
  return result.total > result.items.length
    ? `${result.items.length} of ${result.total} students shown. Keep typing to narrow it down.`
    : `${result.total} ${result.total === 1 ? "student" : "students"} found.`;
}

function Option({
  id,
  item,
  active,
  heading,
  onHover,
  onChoose,
}: {
  id: string;
  item: SearchItem;
  active: boolean;
  heading: string | null;
  onHover: () => void;
  onChoose: () => void;
}) {
  return (
    <>
      {heading && (
        <li role="presentation" className="border-t-2 border-ink px-3.5 pt-2.5 pb-1 font-mono text-[11px] font-semibold tracking-[.1em] text-muted uppercase">
          {heading}
        </li>
      )}
      <li
        id={id}
        role="option"
        aria-selected={active}
        onMouseMove={onHover}
        onClick={onChoose}
        className={`flex min-h-[60px] cursor-pointer items-center justify-between gap-3 border-b border-ink/15 px-3.5 py-2.5 last:border-b-0 ${active ? "bg-butter" : ""}`}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg leading-tight font-bold">
            {fullName(item)}
            {item.sameName && (
              <span className="border border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[.1em] whitespace-nowrap">
                SAME NAME
              </span>
            )}
          </span>
          <span className="text-[13.5px] text-body">
            {gradeText(item.grade)} · Homeroom {item.homeroom} · {item.teacher}
          </span>
        </span>
        {item.total === null ? (
          <span className="max-w-[92px] flex-none text-right text-[13px] leading-tight text-muted">No donations recorded</span>
        ) : (
          <span className="flex flex-none flex-col items-end">
            <span className="font-display text-[26px] leading-none font-black tabular-nums">{fmt(item.total)}</span>
            <span className="text-xs whitespace-nowrap text-muted">
              {item.rank === null ? "not ranked yet" : `#${item.rank} all-time`}
            </span>
          </span>
        )}
      </li>
    </>
  );
}
