"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { useSessionSaved } from "@/lib/volunteer/provider";
import type { SavedEntry } from "@/lib/volunteer/session-saved";
import { fullName } from "@/lib/volunteer/search";
import { formatTime } from "@/lib/volunteer/time";
import { MONO_LABEL } from "@/lib/volunteer/ui";
import { DELETE_TRIGGER, DeleteLogConfirm } from "./delete-log-confirm";
import { focusQuietly } from "./use-hotkeys";

/** Logs created in this browser tab, newest first, each one click from its editor. */
export function SessionList() {
  const entries = useSessionSaved();
  const headingRef = useRef<HTMLHeadingElement>(null);
  return (
    <section aria-labelledby="session-title">
      <h2
        id="session-title"
        ref={headingRef}
        tabIndex={-1}
        className={`${MONO_LABEL} border-b-2 border-ink pb-2 outline-offset-4`}
      >
        Saved this session
      </h2>
      {entries.length === 0 ? (
        <p className="py-4 text-[14px] text-muted">Nothing saved yet. Your saves appear here.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            // A deleted entry leaves the list, so focus moves to the heading.
            <SessionItem key={entry.log.id} entry={entry} onDeleted={() => focusQuietly(headingRef.current)} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-[13px] text-muted">Scan for doubles or typos — Edit fixes a log, Delete removes it.</p>
    </section>
  );
}

function SessionItem({ entry: { log, student }, onDeleted }: { entry: SavedEntry; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const what = `${formatAmount(logAmount(log))} for ${fullName(student)}, saved ${formatTime(log.createdAt)}`;
  return (
    <li className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 border-b border-rule py-2">
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold">{fullName(student)}</span>
        <span className="block text-[13px] text-body">
          {student.homeroom} · {formatTime(log.createdAt)}
        </span>
      </span>
      <span className="font-display text-xl font-extrabold tabular-nums">{formatAmount(logAmount(log))}</span>
      <Link
        href={`/volunteer?student=${student.id}&edit=${log.id}`}
        aria-label={`Edit ${what}`}
        className="flex min-h-11 items-center border-2 border-ink px-3 text-[14px] font-bold no-underline hover:bg-ink hover:text-paper"
      >
        Edit
      </Link>
      <button
        ref={deleteRef}
        type="button"
        onClick={() => setConfirming(true)}
        aria-expanded={confirming}
        aria-label={`Delete ${what}`}
        className={`${DELETE_TRIGGER} text-[14px]`}
      >
        Delete
      </button>
      {confirming && (
        <DeleteLogConfirm
          logId={log.id}
          description={what}
          className="col-span-full pt-2 pb-1"
          onCancel={() => {
            setConfirming(false);
            focusQuietly(deleteRef.current);
          }}
          onDeleted={onDeleted}
        />
      )}
    </li>
  );
}
