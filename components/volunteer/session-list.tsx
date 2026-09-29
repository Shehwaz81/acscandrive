"use client";

import Link from "next/link";
import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { useSessionSaved } from "@/lib/volunteer/provider";
import { fullName } from "@/lib/volunteer/search";
import { formatTime } from "@/lib/volunteer/time";
import { MONO_LABEL } from "@/lib/volunteer/ui";

/** Logs created in this browser tab, newest first, each one click from its editor. */
export function SessionList() {
  const entries = useSessionSaved();
  return (
    <section aria-labelledby="session-title">
      <h2 id="session-title" className={`${MONO_LABEL} border-b-2 border-ink pb-2`}>
        Saved this session
      </h2>
      {entries.length === 0 ? (
        <p className="py-4 text-[14px] text-muted">Nothing saved yet. Your saves appear here.</p>
      ) : (
        <ul>
          {entries.map(({ log, student }) => (
            <li
              key={log.id}
              className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-rule py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold">{fullName(student)}</span>
                <span className="block text-[13px] text-body">
                  {student.homeroom} · {formatTime(log.createdAt)}
                </span>
              </span>
              <span className="font-display text-xl font-extrabold tabular-nums">
                {formatAmount(logAmount(log))}
              </span>
              <Link
                href={`/volunteer?student=${student.id}&edit=${log.id}`}
                aria-label={`Edit ${formatAmount(logAmount(log))} for ${fullName(student)}`}
                className="flex min-h-11 items-center border-2 border-ink px-3 text-[14px] font-bold no-underline hover:bg-ink hover:text-paper"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[13px] text-muted">Scan for doubles or typos — Edit fixes a log directly.</p>
    </section>
  );
}
