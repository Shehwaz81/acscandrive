"use client";

import { useEffect, useState } from "react";
import { type StandingsRepository, StudentNotFoundError } from "./repository";
import type { StudentProfile, StudentRef } from "./types";

/** "not-found": the ref in the link is unknown or was altered; retrying won't help. */
export type ProfileStatus = "idle" | "loading" | "ready" | "error" | "not-found";

/**
 * The open student's profile. Stamped with the ref and attempt it answers, so
 * a slow reply for a student the visitor has already closed is dropped.
 */
export function useStudentProfile(repo: StandingsRepository, ref: StudentRef | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ stamp: string; profile?: StudentProfile; notFound?: boolean } | null>(null);
  const stamp = ref ? `${ref}#${attempt}` : null;

  useEffect(() => {
    if (!ref || !stamp) return;
    let cancelled = false;
    repo.getStudentProfile(ref).then(
      (profile) => !cancelled && setState({ stamp, profile }),
      (e) => !cancelled && setState({ stamp, notFound: e instanceof StudentNotFoundError }),
    );
    return () => {
      cancelled = true;
    };
  }, [repo, ref, stamp]);

  let status: ProfileStatus;
  if (!stamp) status = "idle";
  else if (state?.stamp !== stamp) status = "loading";
  else status = state.profile ? "ready" : state.notFound ? "not-found" : "error";

  const retry = () => setAttempt((a) => a + 1);
  return { status, profile: status === "ready" ? state!.profile! : null, retry };
}
