"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { useUpdateLog } from "@/lib/volunteer/provider";
import { formatDay, formatDayTime, formatTime } from "@/lib/volunteer/time";
import type { DonationLog, Method } from "@/lib/volunteer/types";
import { BTN_PRIMARY, BTN_SECONDARY, MONO_LABEL, SPINNER } from "@/lib/volunteer/ui";
import { amountToInput, isLargeAmount, parseAmount } from "@/lib/volunteer/validation";
import { AmountInput } from "./amount-input";
import { DELETE_TRIGGER, DeleteLogConfirm } from "./delete-log-confirm";
import { FieldError } from "./field-error";
import { focusQuietly } from "./use-hotkeys";
import { MethodTag } from "./method-tag";

export const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 [grid-template-areas:'amount_method_edit'_'date_date_date'] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_148px] md:[grid-template-areas:'date_method_amount_edit']";

type Props = {
  log: DonationLog;
  editing: boolean;
  editDisabled: boolean;
  updated: boolean;
  editButtonRef: Ref<HTMLButtonElement>;
  onEdit: () => void;
  onClose: () => void;
  onSaved: (before: DonationLog, after: DonationLog) => void;
  onDeleted: (log: DonationLog) => void;
};

/** One log: a read-only row (with an inline delete confirm), or (while editing) an inline editor panel. */
export function LogRow(props: Props) {
  if (props.editing) return <LogEditor {...props} />;
  return <LogView {...props} />;
}

function LogView({ log, editDisabled, updated, editButtonRef, onEdit, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const what = `log from ${formatDayTime(log.createdAt)}, ${formatAmount(logAmount(log))}`;
  return (
    <div
      role="row"
      className={`${ROW_GRID} min-h-[60px] items-center border-b border-rule px-3 py-2.5 md:px-4 ${
        updated ? "bg-butter" : ""
      }`}
    >
      <div role="cell" className="text-[14px] [grid-area:date] md:text-[15px]">
        <span className="font-semibold">{formatDay(log.createdAt)}</span>
        <span className="text-muted">
          <span className="md:hidden"> · </span>
          <span className="max-md:hidden"> </span>
          {formatTime(log.createdAt)}
        </span>
      </div>
      <div role="cell" className="[grid-area:method]">
        <MethodTag method={log.method} />
      </div>
      <div role="cell" className="flex items-center gap-2.5 [grid-area:amount]">
        <span className="font-display text-[26px] leading-none font-extrabold tabular-nums">
          {formatAmount(logAmount(log))}
        </span>
        {updated && (
          <span className={`${MONO_LABEL} bg-ink px-1.5 py-0.5 text-[10.5px] text-butter`}>Updated</span>
        )}
      </div>
      <div role="cell" className="flex justify-end gap-1 [grid-area:edit]">
        <button
          ref={editButtonRef}
          type="button"
          onClick={onEdit}
          disabled={editDisabled || confirming}
          aria-label={`Edit ${what}`}
          className={BTN_SECONDARY}
        >
          Edit
        </button>
        <button
          ref={deleteRef}
          type="button"
          onClick={() => setConfirming(true)}
          disabled={editDisabled}
          aria-expanded={confirming}
          aria-label={`Delete ${what}`}
          className={DELETE_TRIGGER}
        >
          Delete
        </button>
      </div>
      {confirming && (
        <div role="cell" className="col-span-full flex justify-end pt-2 pb-1">
          <DeleteLogConfirm
            logId={log.id}
            description={what}
            onCancel={() => {
              setConfirming(false);
              focusQuietly(deleteRef.current);
            }}
            onDeleted={() => onDeleted(log)}
          />
        </div>
      )}
    </div>
  );
}

function LogEditor({ log, onClose, onSaved }: Props) {
  const id = useId();
  const fieldId = `${id}-amount`;
  const errorId = `${id}-error`;
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateLog = useUpdateLog();
  const original = logAmount(log);
  const [method, setMethod] = useState<Method>(log.method);
  const [raw, setRaw] = useState(amountToInput(original));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "failed">("idle");
  const saving = status === "saving";

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest" });
    focusQuietly(inputRef.current);
    // Select the current value so typing replaces it.
    inputRef.current?.select();
  }, []);

  // Refocus after a failure once the field is enabled again (it is disabled while saving).
  useEffect(() => {
    if (status === "failed") focusQuietly(inputRef.current);
  }, [status]);

  const parsed = parseAmount(method, raw);
  const current = formatAmount(original);

  const save = async () => {
    if (saving) return;
    if (!parsed.ok) {
      setFieldError(parsed.message);
      focusQuietly(inputRef.current);
      return;
    }
    const a = parsed.amount;
    const unchanged =
      a.method === original.method &&
      (a.method === "cans" ? a.cans === log.cans : a.cashCents === log.cashCents);
    if (unchanged) return onClose();
    setStatus("saving");
    try {
      const after = await updateLog(log.id, a);
      onSaved(log, after);
    } catch {
      setStatus("failed");
    }
  };

  const switchMethod = (m: Method) => {
    if (saving) return;
    setMethod(m);
    setFieldError(null);
    focusQuietly(inputRef.current);
  };

  const segment = (m: Method, label: string) => (
    <button
      type="button"
      aria-pressed={method === m}
      disabled={saving}
      onClick={() => switchMethod(m)}
      className={`min-h-11 flex-1 px-4 text-[15px] font-bold md:flex-none ${
        method === m ? "bg-ink text-paper" : "bg-field text-ink hover:bg-kraft"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div role="row" className="border-b border-rule bg-paper p-2 md:p-3">
      <div
        role="cell"
        ref={panelRef}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !saving) {
            e.stopPropagation();
            onClose();
          }
        }}
        className="block border-[3px] border-ink bg-field p-4 md:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={MONO_LABEL}>Editing · {formatDayTime(log.createdAt)}</p>
          <p className="text-[14px] text-body">
            Currently <strong>{current}</strong>
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
          <div role="group" aria-label="Method" className="flex border-2 border-ink">
            {segment("cans", "Cans")}
            {segment("cash", "$ Cash")}
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={fieldId} className="sr-only">
              {method === "cans" ? "How many cans?" : "How much cash?"}
            </label>
            <AmountInput
              id={fieldId}
              inputRef={inputRef}
              size="compact"
              method={method}
              value={raw}
              onChange={(v) => {
                setRaw(v.replace(/[^0-9.,]/g, ""));
                setFieldError(null);
              }}
              onMethodChange={switchMethod}
              onSubmit={save}
              onEscape={() => !saving && onClose()}
              invalid={!!fieldError}
              describedBy={fieldError ? errorId : undefined}
              disabled={saving}
            />
            {fieldError && <FieldError id={errorId}>{fieldError}</FieldError>}
            {!fieldError && parsed.ok && isLargeAmount(parsed.amount) && (
              <p className="mt-2 bg-butter px-2 py-1 text-[14px] font-semibold">
                That’s a big one — double-check before saving.
              </p>
            )}
          </div>
        </div>

        {status === "failed" && (
          <div role="alert" className="mt-3 border-[3px] border-tomato bg-error-surface px-3 py-2.5 text-[15px]">
            <strong>Not saved.</strong> The log still shows {current}. Your change is still filled in — try
            Save again.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            aria-disabled={saving}
            aria-busy={saving}
            className={`${BTN_PRIMARY} min-h-12 text-[16px]`}
          >
            {saving ? (
              <>
                <span aria-hidden className={SPINNER} />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>
            Cancel
          </button>
          <p className="text-[13px] text-muted max-md:hidden">Enter saves · Esc cancels · $ or C switches method</p>
        </div>
      </div>
    </div>
  );
}
