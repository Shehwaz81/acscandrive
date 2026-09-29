"use client";

import { useEffect, useRef, useState } from "react";
import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { formatDayTime } from "@/lib/volunteer/time";
import type { DonationLog } from "@/lib/volunteer/types";
import { MONO_LABEL } from "@/lib/volunteer/ui";
import { LogRow, ROW_GRID } from "./log-row";
import { focusQuietly } from "./use-hotkeys";

type Change = { before: DonationLog; after: DonationLog };

/**
 * A student's logs, newest first. One row at a time can be edited in place;
 * an edit overwrites the log directly.
 */
export function LogTable({
  logs,
  studentName,
  initialEditId,
}: {
  logs: DonationLog[];
  studentName: string;
  /** Open this log in edit mode once it is loaded (deep link from "Saved this session"). */
  initialEditId?: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [handledDeepLink, setHandledDeepLink] = useState<string | null>(null);
  const [changes, setChanges] = useState<Map<string, DonationLog>>(new Map());
  const [lastChange, setLastChange] = useState<Change | null>(null);
  const [returnFocusTo, setReturnFocusTo] = useState<string | null>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement | null>());

  if (initialEditId && initialEditId !== handledDeepLink && logs.some((l) => l.id === initialEditId)) {
    setHandledDeepLink(initialEditId);
    setEditingId(initialEditId);
  }

  useEffect(() => {
    if (!returnFocusTo) return;
    focusQuietly(editButtons.current.get(returnFocusTo));
  }, [returnFocusTo]);

  // Show the saved version immediately, before the refetch lands.
  const shown = logs.map((l) => {
    const c = changes.get(l.id);
    return c && c.updatedAt >= l.updatedAt ? c : l;
  });

  const close = (id: string) => {
    setEditingId(null);
    setReturnFocusTo(id);
  };

  if (!shown.length) {
    return <p className="border-2 border-dashed border-rule px-4 py-6 text-center text-muted">No logs yet.</p>;
  }

  return (
    <div>
      <div role="status">
        {lastChange && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 bg-butter px-4 py-2.5 text-[15px]">
            <p>
              <span aria-hidden>✓ </span>
              <strong>Log updated.</strong> {formatDayTime(lastChange.before.createdAt)}:{" "}
              {formatAmount(logAmount(lastChange.before))} →{" "}
              <strong>{formatAmount(logAmount(lastChange.after))}</strong>
            </p>
            <button
              type="button"
              onClick={() => setLastChange(null)}
              className="min-h-11 px-2 text-[14px] font-bold underline underline-offset-4"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div role="table" aria-label={`Donation logs for ${studentName}`} className="border-t-2 border-ink">
        <div role="rowgroup" className="max-md:hidden">
          <div role="row" className={`${ROW_GRID} border-b-2 border-ink px-4 py-2 text-muted ${MONO_LABEL}`}>
            <span role="columnheader" className="[grid-area:date]">Date &amp; time</span>
            <span role="columnheader" className="[grid-area:method]">Method</span>
            <span role="columnheader" className="[grid-area:amount]">Amount</span>
            <span role="columnheader" className="[grid-area:edit]">
              <span className="sr-only">Edit</span>
            </span>
          </div>
        </div>
        <div role="rowgroup">
          {shown.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              editing={editingId === log.id}
              editDisabled={editingId !== null}
              updated={changes.has(log.id)}
              editButtonRef={(el) => {
                editButtons.current.set(log.id, el);
              }}
              onEdit={() => {
                setReturnFocusTo(null);
                setEditingId(log.id);
              }}
              onClose={() => close(log.id)}
              onSaved={(before, after) => {
                setChanges((m) => new Map(m).set(after.id, after));
                setLastChange({ before, after });
                close(after.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
