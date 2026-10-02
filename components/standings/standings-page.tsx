"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { fmt } from "@/lib/homepage";
import { createStandingsRepository, DATA_SOURCE } from "@/lib/standings";
import { TOP_N } from "@/lib/standings/build";
import { isMockScenario, mockStandingsData } from "@/lib/standings/mock-repository";
import type { StandingsRepository } from "@/lib/standings/repository";
import type { StandingsData, StudentRef } from "@/lib/standings/types";
import { useStudentProfile } from "@/lib/standings/use-student-profile";
import { useStudentSearch } from "@/lib/standings/use-student-search";
import { WRAP } from "@/lib/site";
import { AllTimeTable } from "./all-time-table";
import { StudentDrawer } from "./student-drawer";
import { StudentSearch } from "./student-search";
import { type PageData, TodayShelf } from "./today-shelf";
import { setUrlParam, useUrlParam } from "./use-url-param";

/**
 * The Student Standings page. `data` is the podium and table, computed on the
 * server; null means it couldn't be loaded, which renders as a failure and
 * never as zeros. Search and student details are fetched on demand through
 * the repository, so they still work when `data` failed.
 */
export function StandingsPage({
  data,
  onRetry,
  repository,
  showOutsideNote,
}: {
  data: StandingsData | null;
  /** Reloads the page's data; defaults to reloading the page. */
  onRetry?: () => void;
  /** Tests inject their own instead. */
  repository?: StandingsRepository;
  /** Passed to TodayShelf: false hides the "not in the top 25, yet" marker note. */
  showOutsideNote?: boolean;
}) {
  // ?standings=live|tie|two|none|loading|error picks a mock scenario; ignored with real data.
  const param = useUrlParam("standings");
  const scenario = DATA_SOURCE === "mock" && !repository && isMockScenario(param) ? param : null;
  const [retried, setRetried] = useState(false);

  const page = useMemo<PageData>(() => {
    if (scenario === "loading") return { kind: "loading" };
    if (scenario === "error") return retried ? { kind: "ready", data: mockStandingsData() } : { kind: "error" };
    if (scenario) return { kind: "ready", data: mockStandingsData(scenario) };
    return data ? { kind: "ready", data } : { kind: "error" };
  }, [scenario, retried, data]);
  const repo = useMemo(
    () => repository ?? createStandingsRepository(DATA_SOURCE, scenario ?? "live"),
    [repository, scenario],
  );
  const retry = () => (scenario === "error" ? setRetried(true) : onRetry ? onRetry() : window.location.reload());

  const [query, setQuery] = useState("");
  const search = useStudentSearch(repo, query);
  const cardInput = useRef<HTMLInputElement>(null);
  const barInput = useRef<HTMLInputElement>(null);
  const searchLabel = useId();

  // The open student lives in the URL (?student=<ref>), so refresh, share and Back all work.
  const studentRef = useUrlParam("student");
  const profile = useStudentProfile(repo, studentRef);
  const trigger = useRef<HTMLElement | null>(null);
  const pushed = useRef(false);

  function openStudent(ref: StudentRef, from: HTMLElement | null) {
    trigger.current = from;
    pushed.current = true;
    setUrlParam("student", ref, "push");
  }

  function closeStudent() {
    // Opened here: step back, so Back and the close button end in the same place.
    if (pushed.current) window.history.back();
    else setUrlParam("student", null, "replace");
  }

  useEffect(() => {
    if (studentRef) return;
    pushed.current = false;
    trigger.current?.focus({ preventScroll: true });
    trigger.current = null;
  }, [studentRef]);

  function focusSearch() {
    const input = cardInput.current?.offsetParent ? cardInput.current : barInput.current;
    input?.scrollIntoView?.({ block: "center" });
    input?.focus({ preventScroll: true });
  }

  const searchProps = {
    query,
    onQueryChange: setQuery,
    status: search.status,
    result: search.result,
    onRetry: search.retry,
    onOpen: openStudent,
  };
  const rosterCount = page.kind === "ready" ? page.data.rosterCount : null;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-3 font-semibold text-paper focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <div className="sticky top-0 z-30 lg:static">
        <SiteHeader linkBase="/" homeHref="/" current="/students" />
        <div className="border-b-2 border-ink bg-ink px-3 py-2 lg:hidden">
          <StudentSearch variant="bar" inputRef={barInput} {...searchProps} />
        </div>
      </div>

      <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
        {DATA_SOURCE === "mock" && !repository && (
          <p className="bg-butter px-5 py-2 text-center text-sm font-semibold">
            Demo data: these students and donations are made up.
          </p>
        )}
        <section aria-labelledby="page-title" className="bg-paper">
          <div
            className={`${WRAP} grid gap-8 pt-9 pb-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16 lg:pt-16 lg:pb-14`}
          >
            <div className="flex flex-col gap-3 lg:gap-4">
              <span className="font-mono text-xs font-semibold tracking-[.14em] text-muted">INDIVIDUAL TABLES</span>
              <h1
                id="page-title"
                className="font-display text-[clamp(4rem,21vw,5rem)] leading-[.8] font-black uppercase lg:text-[clamp(7rem,10.8vw,9.75rem)]"
              >
                Student
                <br />
                <span className="text-tomato">Standings</span>
              </h1>
              <p className="mt-1 font-display text-[22px] leading-none font-extrabold uppercase lg:text-[32px]">
                Today’s leaders. All-time contributors.
              </p>
              <nav aria-label="On this page" className="mt-3 hidden gap-7 lg:flex">
                {[
                  { href: "#today", n: "01", label: "Leading today" },
                  { href: "#all-time", n: "02", label: `All-time top ${TOP_N}` },
                ].map((l) => (
                  <a key={l.href} href={l.href} className="border-b-[3px] border-butter pb-1 text-[15px] font-semibold no-underline">
                    <span className="font-mono text-xs text-muted">{l.n}</span> {l.label} <span aria-hidden>↓</span>
                  </a>
                ))}
              </nav>
            </div>

            <div className="hidden flex-col gap-4 bg-ink p-7 text-paper shadow-[8px_8px_0_var(--color-butter)] lg:flex">
              <span id={searchLabel} className="font-display text-[40px] leading-none font-black uppercase">
                Find a student
              </span>
              <StudentSearch variant="card" inputRef={cardInput} labelledBy={searchLabel} {...searchProps} />
              <p className="text-sm text-rule">
                {rosterCount === null
                  ? `Searches the whole roster, not just the top ${TOP_N}.`
                  : `Searches all ${fmt(rosterCount)} students, not just the top ${TOP_N}.`}
              </p>
            </div>
          </div>
        </section>

        <TodayShelf page={page} onOpen={openStudent} onRetry={retry} showOutsideNote={showOutsideNote} />
        <AllTimeTable page={page} selected={studentRef} onOpen={openStudent} onRetry={retry} onFind={focusSearch} />
      </main>
      <SiteFooter linkBase="/" />

      {studentRef && (
        <StudentDrawer
          key={studentRef}
          status={profile.status === "idle" ? "loading" : profile.status}
          profile={profile.profile}
          onRetry={profile.retry}
          onClose={closeStudent}
        />
      )}
    </>
  );
}
