"use client";

import Link from "next/link";
import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { useRecentLogs } from "@/lib/volunteer/provider";
import { fullName } from "@/lib/volunteer/search";
import { formatDay, formatTime, isTodayToronto } from "@/lib/volunteer/time";
import { gradeText } from "@/lib/volunteer/types";
import { BTN_SECONDARY, MONO_LABEL } from "@/lib/volunteer/ui";

const SHOWN = 8;
/** Fetch extra rows so the footer can count today's logs. */
const FETCHED = 100;

export function RecentLogs() {
  const recent = useRecentLogs(FETCHED);
  const logs = recent.data ?? [];
  const today = logs.filter((l) => isTodayToronto(l.createdAt)).length;

  return (
    <section aria-labelledby="recent-logs-title">
      <h2 id="recent-logs-title" className={`${MONO_LABEL} border-b-2 border-ink pb-2`}>
        Recent logs · All volunteers
      </h2>
      {recent.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-4 text-[14px] text-error">
          Couldn’t load recent logs.
          <button type="button" onClick={recent.retry} className={BTN_SECONDARY}>
            Try again
          </button>
        </div>
      ) : !recent.data ? (
        <p className="py-4 text-[14px] text-muted">Loading…</p>
      ) : (
        <ul>
          {logs.slice(0, SHOWN).map((l) => (
            <li key={l.id}>
              <Link
                href={`/volunteer?student=${l.student.id}`}
                scroll={false}
                className="grid min-h-14 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-2 no-underline hover:bg-kraft hover:text-ink"
              >
                <span className="text-[13px] text-muted tabular-nums">
                  {isTodayToronto(l.createdAt) ? formatTime(l.createdAt) : formatDay(l.createdAt)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">{fullName(l.student)}</span>
                  <span className="block text-[13px] text-body">
                    {gradeText(l.student.grade)} · {l.student.homeroom}
                  </span>
                </span>
                <span className="font-display text-xl font-extrabold tabular-nums">
                  {formatAmount(logAmount(l))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {recent.data && (
        <p className="mt-3 text-[13px] text-muted">
          {today >= FETCHED ? `${FETCHED}+` : today} {today === 1 ? "log" : "logs"} today across all volunteers.
          Pick one to open that student.
        </p>
      )}
    </section>
  );
}
