"use client";

import type { Ref } from "react";
import { formatAmount } from "@/lib/volunteer/money";
import { fullName } from "@/lib/volunteer/search";
import type { Amount, Student } from "@/lib/volunteer/types";
import { BTN_PRIMARY, KBD, MONO_LABEL, SPINNER } from "@/lib/volunteer/ui";

/** What will be written, stated plainly next to the button that writes it. There's no confirm dialog. */
export function SaveBar({
  student,
  amount,
  prompt,
  saving,
  failed,
  onSave,
  buttonRef,
}: {
  student: Student | null;
  /** The amount if the field is valid. */
  amount: Amount | null;
  /** Shown instead of the summary when something is missing. */
  prompt: string;
  saving: boolean;
  failed: boolean;
  onSave: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="flex flex-col gap-4 border-t-[3px] border-ink pt-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0" aria-live="polite">
        <p className={`${MONO_LABEL} text-muted`}>About to save</p>
        {student && amount ? (
          <p className="mt-1 text-[16px] leading-snug">
            <span className="mr-1.5 inline-block bg-butter px-2 font-display text-[32px] leading-tight font-black uppercase">
              {formatAmount(amount)}
            </span>
            for <strong>{fullName(student)}</strong>, homeroom <strong>{student.homeroom}</strong>
          </p>
        ) : (
          <p className="mt-1 text-[16px] text-body">{prompt}</p>
        )}
      </div>
      <button
        ref={buttonRef}
        type="button"
        onClick={onSave}
        aria-disabled={saving}
        aria-busy={saving}
        className={`${BTN_PRIMARY} mr-[5px] min-h-16 flex-none text-[18px] md:min-w-[260px]`}
      >
        {saving ? (
          <>
            <span aria-hidden className={SPINNER} />
            Saving…
          </>
        ) : (
          <>
            {failed ? "Try saving again" : "Save donation"}
            <kbd className={KBD} aria-hidden>
              ⏎
            </kbd>
          </>
        )}
      </button>
    </div>
  );
}
