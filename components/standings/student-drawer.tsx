"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Ticket } from "@/components/ticket";
import { shortDate } from "@/lib/grade-wars/format";
import { fmt } from "@/lib/homepage";
import { TOP_N } from "@/lib/standings/build";
import {
  cansLabel,
  dressDownStatus,
  fullName,
  homeroomStatus,
  homeroomStep,
  splitLabel,
  windowLabel,
} from "@/lib/standings/format";
import { driveLabel } from "@/lib/standings/rules";
import type { DressDownProgress, HistoryEntry, HomeroomProgress, StudentProfile } from "@/lib/standings/types";
import type { ProfileStatus } from "@/lib/standings/use-student-profile";
import { DRIVE } from "@/lib/site";
import { canEquivalents, formatCents } from "@/lib/volunteer/money";
import { formatTime, torontoDayKey } from "@/lib/volunteer/time";

const HISTORY_PAGE = 10;
const CLOSE_MS = 200;
const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/**
 * A student's details: a right-hand drawer on desktop, the full screen on a
 * phone. Read-only by design: no edit controls, admin links or internal fields.
 */
export function StudentDrawer({
  status,
  profile,
  onRetry,
  onClose,
}: {
  status: Exclude<ProfileStatus, "idle">;
  profile: StudentProfile | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    closeButton.current?.focus();
    // The page behind must not scroll; its position is untouched, so closing returns to the same spot.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  function close() {
    if (closing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return onClose();
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  const name = profile ? fullName(profile.student) : status === "loading" ? "Loading student" : "Student details";

  return (
    <div className="fixed inset-0 z-40" onKeyDown={onKeyDown}>
      <div aria-hidden onClick={close} className={`absolute inset-0 bg-ink/50 ${closing ? "opacity-0 transition-opacity duration-200" : ""}`} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-0 overflow-y-auto bg-paper text-ink lg:left-auto lg:w-[640px] lg:border-l-[3px] lg:border-ink lg:shadow-[-10px_0_0_var(--color-butter)] ${
          closing ? "drawer-out" : "drawer-in"
        }`}
      >
        <div className="sticky top-0 z-10 flex h-14 items-center border-b-2 border-ink bg-paper px-3 lg:justify-end lg:px-6">
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            className="h-11 px-2 text-[15px] font-bold hover:text-tomato"
          >
            <span className="lg:hidden">
              <span aria-hidden>← </span>Back to standings
            </span>
            <span className="hidden lg:inline">
              Close <span aria-hidden>✕</span>
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-8 px-5 pt-7 pb-12 lg:px-10 lg:pt-9">
          {!profile && (
            <h2 id={titleId} className="sr-only">
              {name}
            </h2>
          )}
          {status === "loading" && (
            <div role="status" className="flex flex-col gap-4">
              <span className="sr-only">Loading student details…</span>
              {[80, 24, 140, 180].map((h, i) => (
                <span key={i} aria-hidden className="block animate-pulse bg-kraft motion-reduce:animate-none" style={{ height: h }} />
              ))}
            </div>
          )}
          {status === "error" && (
            <Problem
              title="This student’s details didn’t load"
              body="Nothing is wrong with their record; we just couldn’t reach it."
              action="Try again"
              onAction={onRetry}
            />
          )}
          {status === "not-found" && (
            <Problem
              title="We couldn’t find that student"
              body="The link may be old or incomplete. Search for the name instead."
              action="Back to standings"
              onAction={close}
            />
          )}
          {profile && <Profile profile={profile} titleId={titleId} />}
        </div>
      </div>
    </div>
  );
}

function Problem({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 border-[3px] border-ink p-5">
      <p className="font-display text-[28px] leading-none font-extrabold uppercase">{title}</p>
      <p className="text-[15px] text-body">{body}</p>
      <button type="button" onClick={onAction} className="mt-1 h-11 bg-ink px-5 text-[15px] font-bold text-paper hover:bg-tomato">
        {action}
      </button>
    </div>
  );
}

const EYEBROW = "font-mono text-[11px] font-semibold tracking-[.12em]";

function Profile({ profile, titleId }: { profile: StudentProfile; titleId: string }) {
  const { student, allTime, today, history } = profile;
  const never = history.length === 0;
  return (
    <>
      <header className="flex flex-col gap-3">
        <h2 id={titleId} className="font-display text-[58px] leading-[.82] font-black break-words uppercase lg:text-[80px]">
          {student.firstName}
          <br />
          {student.lastName}
        </h2>
        <p className="text-[15px] lg:text-base">
          Grade {student.grade} · Homeroom {student.homeroom} · {student.teacher}
        </p>
        {student.sameNameCount > 1 && (
          <p className="-rotate-1 self-start border-2 border-tomato px-3 py-2 text-sm font-semibold text-error">
            {student.sameNameCount} students are named {fullName(student)}. This one is in {student.homeroom}.
          </p>
        )}
      </header>

      <section aria-label="Totals" className="grid border-y-[3px] border-ink sm:grid-cols-2">
        <div className="flex flex-col gap-2 py-5 sm:pr-6">
          <span className={`${EYEBROW} text-muted`}>ALL-TIME · EVERY DRIVE</span>
          {never ? (
            <>
              <span className="font-display text-4xl leading-none font-black uppercase">No donations recorded</span>
              <span className="text-[15px] text-body">Not ranked yet. One donation puts this name on the board.</span>
            </>
          ) : (
            <>
              <span className="font-display text-[76px] leading-[.8] font-black tabular-nums lg:text-[92px]">{fmt(allTime.total)}</span>
              <span className="text-sm text-body">
                {fmt(allTime.cans)} physical {allTime.cans === 1 ? "can" : "cans"} · {formatCents(allTime.cashCents)} cash
              </span>
              {allTime.rank === null ? (
                <span className="text-sm text-body">Not ranked yet: under one can so far.</span>
              ) : (
                <>
                  <span className="self-start bg-ink px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[.1em] text-paper">
                    #{allTime.rank} OF {fmt(allTime.donorCount)} ALL-TIME{allTime.tied ? " · TIED" : ""}
                  </span>
                  <span className="text-sm text-body">
                    {allTime.inTop25
                      ? `Inside the all-time top ${TOP_N}.`
                      : `Outside the all-time top ${TOP_N}; #${TOP_N} is on ${fmt(allTime.cutoffTotal ?? 0)}.`}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t-2 border-ink py-5 sm:border-t-0 sm:border-l-2 sm:pl-6">
          <span className={`${EYEBROW} text-muted`}>TODAY ONLY · {shortDate(today.date).replace(",", "").toUpperCase()}</span>
          {today.cans === 0 && today.cashCents === 0 ? (
            <span className="text-[15px] text-body">Nothing logged today.</span>
          ) : (
            <>
              <span className="font-display text-[56px] leading-[.8] font-black tabular-nums lg:text-[64px]">{fmt(today.total)}</span>
              <span className="text-sm text-body">{splitLabel(today.cans, today.cashCents)}</span>
              {today.rank !== null && (
                <span className="text-sm font-semibold">
                  #{today.rank} of {fmt(today.donorCount)} {today.donorCount === 1 ? "donor" : "donors"} today
                  {today.tied ? " (tied)" : ""}
                </span>
              )}
            </>
          )}
        </div>
      </section>

      <DressDown progress={profile.dressDown} />
      <Dodgeball homeroom={profile.homeroom} />
      <History history={history} today={today.date} />
    </>
  );
}

function DressDown({ progress }: { progress: DressDownProgress }) {
  const w = progress.current;
  if (!w) return null;
  const { threshold } = progress;
  const friday = shortDate(w.friday);
  return (
    <section aria-labelledby="dress-down-title" className="flex flex-col gap-2.5">
      <h3 id="dress-down-title" className="font-display text-[28px] leading-none font-extrabold uppercase">
        Dress-down day
      </h3>
      <Ticket stub={progress.phase === "ended" ? "LAST WEEK" : "THIS WEEK"} className="bg-butter text-ink">
        <div className="flex flex-col gap-3 px-4 py-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`${EYEBROW} text-body`}>{windowLabel(w)}</span>
            {!progress.confirmed && (
              <span className="-rotate-2 border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[.12em]">
                PROVISIONAL RULES
              </span>
            )}
          </div>
          {w.reached ? (
            <p className="font-display text-[34px] leading-[.95] font-black uppercase lg:text-[40px]">
              Target reached: {fmt(w.counted)} counted this week
            </p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-display text-[56px] leading-[.85] font-black whitespace-nowrap tabular-nums lg:text-[68px]">
                {fmt(w.counted)} / {threshold}
              </span>
              <span className="text-[15px] font-semibold">toward {friday}</span>
            </p>
          )}
          <div aria-hidden className="flex gap-1">
            {Array.from({ length: threshold }, (_, i) => (
              <span key={i} className={`h-4 flex-1 border-2 border-ink ${i < w.counted ? "bg-ink" : "bg-transparent"}`} />
            ))}
          </div>
          <p className="text-[15px] font-bold">
            {dressDownStatus(w, progress)}
            {w.reached && <span className="font-normal"> · toward {friday}</span>}
          </p>
          {progress.phase === "before" && <p className="text-sm text-body">Counting starts {shortDate(w.windowStart)}.</p>}
          {progress.phase === "ended" && <p className="text-sm text-body">That was the last dress-down day of this drive.</p>}
          {w.counted > threshold && progress.carryoverConfirmed && !progress.carryover && (
            <p className="text-sm text-body">Extra cans don’t carry over to the next Friday.</p>
          )}
          {progress.previous && (
            <p className="border-t-2 border-dashed border-ink/45 pt-3 text-sm">
              <span className="font-semibold">Previous: {shortDate(progress.previous.friday)}.</span>{" "}
              {fmt(progress.previous.counted)} counted · {dressDownStatus(progress.previous, progress)}
            </p>
          )}
          <p className="text-[13px] text-body">
            Only this week’s donations count here, not the all-time total.
            {!progress.confirmed && " Dates and cutoff are still to be confirmed by the organizers."}
          </p>
        </div>
      </Ticket>
    </section>
  );
}

const STEPS = ["Below target", "Target reached", "Place confirmed"];

function Dodgeball({ homeroom: h }: { homeroom: HomeroomProgress }) {
  const step = homeroomStep(h);
  const pct = h.target > 0 ? Math.min(100, Math.round((h.total / h.target) * 100)) : 0;
  return (
    <section aria-labelledby="dodgeball-title" className="flex flex-col gap-2.5">
      <h3 id="dodgeball-title" className="font-display text-[28px] leading-none font-extrabold uppercase">
        Homeroom dodgeball
      </h3>
      <Ticket stub={`HOMEROOM ${h.homeroom}`} className="bg-ink text-paper" stubBorderClassName="border-paper/45">
        <div className="flex flex-col gap-3 px-4 py-5 lg:px-6">
          <span className={`${EYEBROW} text-butter`}>
            {h.drive.label.toUpperCase()} · {DRIVE.shortDates.toUpperCase()} · WHOLE CLASS COMBINED
          </span>
          <p className="text-[15px] text-rule">
            {h.classSize} students × 10 = <b className="text-paper">{fmt(h.target)}</b> class target
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-display text-[56px] leading-[.85] font-black tabular-nums lg:text-[68px]">{fmt(h.total)}</span>
            <span className="text-[15px] font-semibold whitespace-nowrap">/ {fmt(h.target)} contributed</span>
          </p>
          <div
            role="progressbar"
            aria-label={`Homeroom ${h.homeroom} class target`}
            aria-valuemin={0}
            aria-valuemax={h.target}
            aria-valuenow={Math.min(h.total, h.target)}
            aria-valuetext={`${fmt(h.total)} of ${fmt(h.target)}`}
            className="h-5 border-2 border-paper"
          >
            <div className="h-full butter-stripes" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[15px] font-bold">{homeroomStatus(h)}</p>
          <p className="text-sm text-rule">
            A shared target: everyone in {h.homeroom} adds to one total. Nobody has to bring 10 on their own.
          </p>
          <ol className="grid grid-cols-3 gap-1.5 pt-1">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={i + 1 === step ? "step" : undefined}
                className={`flex flex-col gap-1 border-2 px-2 py-2 ${
                  i + 1 === step ? "border-butter bg-butter text-ink" : "border-paper/30 text-rule"
                }`}
              >
                <span className="font-mono text-[10px] font-bold tracking-[.1em]">0{i + 1}</span>
                <span className="text-[12.5px] leading-tight font-semibold">{label}</span>
              </li>
            ))}
          </ol>
          {h.status !== "confirmed" && (
            <p className="text-[13px] text-rule">
              Reaching the target doesn’t lock in a spot. Places are confirmed as classes are verified, up to {h.maxPlaces}.
            </p>
          )}
        </div>
      </Ticket>
    </section>
  );
}

function History({ history, today }: { history: HistoryEntry[]; today: string }) {
  const [shown, setShown] = useState(HISTORY_PAGE);
  const visible = history.slice(0, shown);
  const earlier = history.length - visible.length;
  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h3 id="history-title" className="font-display text-[28px] leading-none font-extrabold uppercase">
        Donation history
      </h3>
      {history.length === 0 ? (
        <p className="border-t-2 border-ink pt-3 text-[15px] text-body">
          Nothing logged yet. Donations show up here once a volunteer records them.
        </p>
      ) : (
        <>
          <ul className="flex flex-col border-t-2 border-ink">
            {visible.map((entry, i) => {
              const label = driveLabel(entry.date);
              const isToday = torontoDayKey(entry.date) === today;
              return (
                <li key={`${entry.date}-${i}`} className="flex flex-col">
                  {(i === 0 || driveLabel(visible[i - 1].date) !== label) && (
                    <span className={`${EYEBROW} bg-kraft px-2 py-1.5 text-muted uppercase`}>{label}</span>
                  )}
                  <span className="grid grid-cols-[minmax(0,1fr)_64px_minmax(92px,auto)] items-baseline gap-3 border-b border-ink/15 px-2 py-3">
                    <span className="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold">
                      {shortDate(torontoDayKey(entry.date))}
                      <span className="text-[13px] font-normal text-muted">{formatTime(entry.date)}</span>
                      {isToday && <span className="bg-butter px-1.5 font-mono text-[10px] font-bold tracking-[.1em]">TODAY</span>}
                    </span>
                    <span className="text-sm text-body">{entry.method === "cans" ? "Cans" : "Cash"}</span>
                    <span className="flex flex-col items-end text-right">
                      <span className="font-display text-[22px] leading-none font-extrabold tabular-nums">
                        {entry.method === "cans" ? cansLabel(entry.cans ?? 0) : formatCents(entry.cashCents ?? 0)}
                      </span>
                      {entry.method === "cash" && (
                        <span className="text-xs text-muted">= {fmt(canEquivalents(0, entry.cashCents ?? 0))} can-eq.</span>
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {earlier > 0 ? (
            <button
              type="button"
              onClick={() => setShown((n) => n + HISTORY_PAGE)}
              className="h-12 self-start border-2 border-ink px-5 text-[15px] font-bold hover:bg-ink hover:text-paper"
            >
              Load more · {fmt(earlier)} earlier
            </button>
          ) : (
            <p className="text-sm text-muted">That’s everything on record.</p>
          )}
        </>
      )}
      <p className="mt-2 text-sm text-body">
        This page is read-only. Spot a mistake? Tell a Can Drive volunteer at any collection table.
      </p>
    </section>
  );
}
