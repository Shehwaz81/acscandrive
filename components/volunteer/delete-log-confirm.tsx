"use client";

import { useEffect, useRef, useState } from "react";
import { useDeleteLog } from "@/lib/volunteer/provider";
import { BTN_SECONDARY, SPINNER } from "@/lib/volunteer/ui";
import { focusQuietly } from "./use-hotkeys";

/** The quiet "Delete" button that opens the confirm; lighter than Edit so it isn't hit by habit. */
export const DELETE_TRIGGER =
  "inline-flex min-h-11 items-center px-2 text-[15px] font-semibold text-ink underline underline-offset-4 hover:text-tomato-dark disabled:cursor-default disabled:opacity-40 disabled:hover:text-ink";

/**
 * Inline "Delete this log? [Delete] [Cancel]". Focus starts on Cancel so a
 * stray Enter is harmless. `onDeleted` runs only after the delete is confirmed;
 * on failure the panel stays open with an error so the volunteer can retry.
 */
export function DeleteLogConfirm({
  logId,
  description,
  onCancel,
  onDeleted,
  className = "",
}: {
  logId: string;
  /** What is being deleted, for screen readers, e.g. "12 cans for Maya R., 2:14 PM". */
  description: string;
  onCancel: () => void;
  onDeleted: () => void;
  className?: string;
}) {
  const deleteLog = useDeleteLog();
  const [status, setStatus] = useState<"idle" | "deleting" | "failed">("idle");
  const deleting = status === "deleting";
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => focusQuietly(cancelRef.current), []);
  useEffect(() => {
    if (status === "failed") focusQuietly(confirmRef.current);
  }, [status]);

  const confirm = async () => {
    if (deleting) return;
    setStatus("deleting");
    try {
      await deleteLog(logId);
      onDeleted();
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div
      role="group"
      aria-label={`Delete ${description}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !deleting) {
          e.stopPropagation();
          onCancel();
        }
      }}
      className={className}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[15px] font-bold">Delete this log?</p>
        <button
          ref={confirmRef}
          type="button"
          onClick={confirm}
          disabled={deleting}
          aria-busy={deleting}
          className="inline-flex min-h-11 items-center gap-2 bg-tomato-dark px-4 text-[15px] font-bold text-white hover:bg-ink disabled:cursor-default disabled:hover:bg-tomato-dark"
        >
          {deleting ? (
            <>
              <span aria-hidden className={SPINNER} />
              Deleting…
            </>
          ) : (
            "Delete"
          )}
        </button>
        <button ref={cancelRef} type="button" onClick={onCancel} disabled={deleting} className={BTN_SECONDARY}>
          Cancel
        </button>
      </div>
      {status === "failed" && (
        <p role="alert" className="mt-2 border-l-[3px] border-tomato bg-error-surface px-3 py-2 text-[14px]">
          <strong>Not deleted.</strong> The log is still saved. Try Delete again.
        </p>
      )}
    </div>
  );
}
