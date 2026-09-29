"use client";

import { useId, useState, type KeyboardEvent, type Ref } from "react";
import { useStudentSearch } from "@/lib/volunteer/provider";
import type { Student } from "@/lib/volunteer/types";
import { optionId, StudentResultList } from "./student-result-list";

/**
 * Combobox for finding a student: attached listbox, ↑/↓ to move, Enter to
 * pick, Esc to clear. Enter only picks from results that answer exactly what
 * is typed, so a fast Enter can't grab a student from a stale list.
 */
export function StudentSearch({
  onPick,
  inputRef,
  autoFocus = false,
  label = "Find a student",
}: {
  onPick: (student: Student) => void;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  label?: string;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const search = useStudentSearch(query);

  const trimmed = query.trim();
  const result = trimmed && search.data ? search.data : null;
  const options = result ? [...result.exact, ...result.similar] : [];
  const noResults = search.current && options.length === 0;
  const open = options.length > 0;
  const active = options.find((s) => s.id === highlightedId) ?? options[0] ?? null;

  const pick = (s: Student) => {
    setQuery("");
    setHighlightedId(null);
    onPick(s);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      const i = active ? options.indexOf(active) : -1;
      const next = e.key === "ArrowDown" ? Math.min(i + 1, options.length - 1) : Math.max(i - 1, 0);
      setHighlightedId(options[next].id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (search.current && active) pick(active);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      e.stopPropagation();
      setQuery("");
      setHighlightedId(null);
    }
  };

  const status = !trimmed
    ? ""
    : noResults
      ? `No student matches ${trimmed}.`
      : search.current && result
        ? `${result.exact.length} matches, ${result.similar.length} similar.`
        : "";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-[15px] font-bold">
          {label}
        </label>
        <span className="hidden text-[13px] text-muted lg:inline">
          Press <kbd className="border border-muted px-1 font-mono text-[12px]">/</kbd> from anywhere
        </span>
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active ? optionId(listId, active.id) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="Search by first or last name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedId(null);
          }}
          onKeyDown={onKeyDown}
          className="h-[60px] w-full border-2 border-ink bg-field pr-14 pl-4 text-[20px] text-ink placeholder:text-muted"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setHighlightedId(null);
            }}
            className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center text-2xl text-muted hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      <p role="status" className="sr-only">
        {status}
      </p>

      {open && result && (
        <StudentResultList
          listId={listId}
          result={result}
          highlightedId={active?.id ?? null}
          onHighlight={setHighlightedId}
          onPick={pick}
        />
      )}
      {!open && trimmed && search.loading && (
        <p className="border-2 border-t-0 border-ink bg-field px-4 py-3 text-[14px] text-muted">
          Searching…
        </p>
      )}
      {noResults && (
        <div className="border-2 border-t-0 border-ink bg-field px-4 py-4 text-[15px]">
          <p className="font-bold">No student matches “{trimmed}”.</p>
          <p className="mt-1 text-body">
            Check the spelling, or try just the last name. Don’t log it under a different student —
            note their name and homeroom for the drive organizer.
          </p>
        </div>
      )}
      {/* Keep aria-controls pointing at a real element while closed. */}
      {!open && <ul id={listId} role="listbox" aria-label="Matching students" hidden />}
    </div>
  );
}
