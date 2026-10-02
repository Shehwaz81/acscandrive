"use client";

import { useCallback, useEffect, useState } from "react";
import type { GradeWarsRepository } from "./repository";
import type { CollectionDay, GradeDayResult } from "./types";

/** "upcoming": no collection days yet (before the drive starts). */
export type GradeWarsStatus = "loading" | "error" | "ready" | "upcoming";

/**
 * Collection days plus the selected day's result. Defaults to the latest day.
 * A response is only shown if it answers the current day and attempt, so a
 * slow reply for a day the user has already left is dropped.
 */
export function useGradeWars(repo: GradeWarsRepository) {
  // Bumped by retry() to refetch after a failure.
  const [attempt, setAttempt] = useState(0);
  const [daysState, setDaysState] = useState<{ attempt: number; days?: CollectionDay[] } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [resultState, setResultState] = useState<{
    stamp: string;
    result?: GradeDayResult;
  } | null>(null);

  const loadedDays = daysState?.days;
  useEffect(() => {
    if (loadedDays) return;
    let cancelled = false;
    repo.listCollectionDays().then(
      (days) => !cancelled && setDaysState({ attempt, days }),
      () => !cancelled && setDaysState({ attempt }),
    );
    return () => {
      cancelled = true;
    };
  }, [repo, attempt, loadedDays]);

  const days = loadedDays ?? [];
  const selectedDayId = picked ?? days.at(-1)?.id ?? null;
  const stamp = selectedDayId ? `${selectedDayId}#${attempt}` : null;

  useEffect(() => {
    if (!selectedDayId) return;
    let cancelled = false;
    const s = `${selectedDayId}#${attempt}`;
    repo.getDayResult(selectedDayId).then(
      (result) => !cancelled && result.day.id === selectedDayId && setResultState({ stamp: s, result }),
      () => !cancelled && setResultState({ stamp: s }),
    );
    // TODO(realtime): when the selected day is in_progress, subscribe to
    // updates for it here and refetch on change; unsubscribe in the cleanup.
    return () => {
      cancelled = true;
    };
  }, [repo, selectedDayId, attempt]);

  let status: GradeWarsStatus;
  if (!loadedDays) status = daysState?.attempt === attempt ? "error" : "loading";
  else if (!selectedDayId) status = "upcoming";
  else if (resultState?.stamp !== stamp) status = "loading";
  else status = resultState.result ? "ready" : "error";

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    days,
    selectedDayId,
    setSelectedDayId: setPicked,
    result: status === "ready" ? resultState!.result! : null,
    status,
    retry,
  };
}
