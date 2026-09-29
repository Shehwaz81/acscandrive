"use client";

import { findSameNames, fullName, normalizedName } from "@/lib/volunteer/search";
import type { Student, StudentSearchResult } from "@/lib/volunteer/types";
import { MONO_LABEL } from "@/lib/volunteer/ui";

export function optionId(listId: string, studentId: string) {
  return `${listId}-${studentId}`;
}

/** Warning copy for the list, or null when every name is distinct. */
export function duplicateWarning(result: StudentSearchResult): string | null {
  const groups = findSameNames([...result.exact, ...result.similar]);
  const [first] = groups.values();
  if (first) {
    return `${first.length} students are named ${fullName(first[0])}. Check grade and homeroom before you pick.`;
  }
  if (result.similar.length) return "Similar names below. Check spelling and homeroom before you pick.";
  return null;
}

/** Attached results listbox under the search field. */
export function StudentResultList({
  listId,
  result,
  highlightedId,
  onHighlight,
  onPick,
}: {
  listId: string;
  result: StudentSearchResult;
  highlightedId: string | null;
  onHighlight: (id: string) => void;
  onPick: (student: Student) => void;
}) {
  const sameNames = new Set(findSameNames([...result.exact, ...result.similar]).keys());
  const warning = duplicateWarning(result);
  const exactCount = result.exact.length;
  const similarCount = result.similar.length;

  const option = (s: Student) => {
    const highlighted = s.id === highlightedId;
    return (
      <li
        key={s.id}
        id={optionId(listId, s.id)}
        role="option"
        aria-selected={highlighted}
        onMouseMove={() => !highlighted && onHighlight(s.id)}
        // Keep focus in the input so keyboard use continues after a click.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(s)}
        className={`grid min-h-16 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-rule px-4 py-2.5 first:border-t-0 ${
          highlighted ? "bg-butter" : ""
        }`}
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[17px] leading-tight font-bold">{fullName(s)}</span>
            {sameNames.has(normalizedName(s)) && (
              <span className={`${MONO_LABEL} border-2 border-ink px-1.5 py-px text-[10.5px]`}>
                Same name
              </span>
            )}
          </span>
          <span className="block text-[13px] text-body">Grade {s.grade}</span>
        </span>
        <span className="flex items-baseline gap-2 text-right">
          <span className={`${MONO_LABEL} text-muted`}>Homeroom</span>
          <span className="font-display text-2xl leading-none font-extrabold">{s.homeroom}</span>
        </span>
      </li>
    );
  };

  return (
    <div className="border-2 border-t-0 border-ink bg-field">
      <div className={`${MONO_LABEL} flex justify-between gap-4 border-b border-rule px-4 py-2 text-muted`}>
        <span>
          {exactCount} {exactCount === 1 ? "match" : "matches"}
          {similarCount > 0 && ` · ${similarCount} similar`}
        </span>
        <span aria-hidden className="hidden lg:inline">
          ↑↓ move · Enter opens
        </span>
      </div>
      {warning && (
        <p className="border-b border-rule bg-butter px-4 py-2.5 text-[14px] font-semibold">{warning}</p>
      )}
      <ul id={listId} role="listbox" aria-label="Matching students">
        {result.exact.map(option)}
        {similarCount > 0 && (
          <li
            role="presentation"
            className={`${MONO_LABEL} flex items-center gap-3 border-t-2 border-dashed border-muted px-4 pt-2.5 pb-1.5 text-muted`}
          >
            Similar spelling
          </li>
        )}
        {result.similar.map(option)}
      </ul>
    </div>
  );
}
