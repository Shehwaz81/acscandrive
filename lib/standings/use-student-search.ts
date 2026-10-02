"use client";

import { useEffect, useState } from "react";
import { MIN_QUERY } from "./build";
import type { StandingsRepository } from "./repository";
import type { SearchResult } from "./types";

export type SearchStatus = "idle" | "loading" | "ready" | "error";

const DEBOUNCE_MS = 150;
const letters = (q: string) => q.replace(/\s/g, "").length;

/**
 * Roster search as the visitor types. A result is shown only if it answers
 * the current query and attempt, so a slow reply for "ma" can't land on top of
 * the results for "maya" (notes/14-out-of-order-responses.md).
 */
export function useStudentSearch(repo: StandingsRepository, query: string) {
  const q = query.trim();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ stamp: string; result?: SearchResult } | null>(null);
  const active = letters(q) >= MIN_QUERY;
  const stamp = `${q}#${attempt}`;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      repo.searchStudents(q).then(
        (result) => !cancelled && setState({ stamp, result }),
        () => !cancelled && setState({ stamp }),
      );
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repo, q, active, stamp]);

  let status: SearchStatus;
  if (!active) status = "idle";
  else if (state?.stamp !== stamp) status = "loading";
  else status = state.result ? "ready" : "error";

  const retry = () => setAttempt((a) => a + 1);
  return { status, result: status === "ready" ? state!.result! : null, retry };
}
