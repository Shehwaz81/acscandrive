"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useReducer, useRef, useState, type ReactNode } from "react";
import { newSubmissionId } from "@/lib/volunteer/ids";
import { initialLogFlow, logFlowReducer } from "@/lib/volunteer/log-flow";
import { canEquivalents, formatAmount } from "@/lib/volunteer/money";
import { useCreateLog, useMockControls, useStudent } from "@/lib/volunteer/provider";
import { SubmissionConflictError } from "@/lib/volunteer/repository";
import type { Method, Student } from "@/lib/volunteer/types";
import { isLargeAmount, parseAmount } from "@/lib/volunteer/validation";
import { AmountInput } from "./amount-input";
import { ConfirmBlock } from "./confirm-block";
import { FieldError } from "./field-error";
import { KeyboardHelp } from "./keyboard-help";
import { MethodPicker } from "./method-picker";
import { SaveBar } from "./save-bar";
import { SaveFailedBanner } from "./save-failed-banner";
import { SavedReceipt } from "./saved-receipt";
import { SessionList } from "./session-list";
import { StudentSearch } from "./student-search";
import { focusQuietly, isTypingTarget, useHotkeys } from "./use-hotkeys";

type FocusTarget = "search" | "amount" | "save" | "next";

function Step({
  n,
  done,
  title,
  titleId,
  children,
}: {
  n: number;
  done: boolean;
  title: ReactNode;
  titleId?: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4">
      <span
        aria-hidden
        className={`flex size-10 items-center justify-center rounded-full border-2 border-ink font-display text-xl font-black ${
          done ? "bg-ink text-paper" : "bg-paper text-ink"
        }`}
      >
        {n}
      </span>
      <div className="min-w-0">
        <h2 id={titleId} className="flex min-h-10 items-center text-[17px] font-bold">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}

/**
 * Find student → confirm → (method) → amount → save → next. The common path is
 * keyboard-only: type a name, Enter, type a count, Enter, Enter.
 */
export function LogFlowView() {
  const [state, dispatch] = useReducer(logFlowReducer, null, () => initialLogFlow(newSubmissionId()));
  const { status, student, method, raw, fieldError, saveError } = state;
  const saving = status === "saving";
  const createLog = useCreateLog();
  const demo = useMockControls() !== null;
  const ids = useId();
  const amountId = `${ids}-amount`;
  const errorId = `${ids}-error`;
  const hintId = `${ids}-hint`;
  const methodTitleId = `${ids}-method`;

  // Refs for moving focus after state changes; consumed after each render.
  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  // Guards against two saves starting before React re-renders.
  const inFlight = useRef(false);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const refs = { search: searchRef, amount: amountRef, save: saveRef, next: nextRef };
    focusQuietly(refs[target].current);
  });

  // Preselect from ?student= (the dashboard's "Log a donation for …").
  const params = useSearchParams();
  const preselectId = params.get("student");
  const preselect = useStudent(preselectId);
  const [preselected, setPreselected] = useState<string | null>(null);
  if (preselect.data && preselectId && preselected !== preselectId) {
    setPreselected(preselectId);
    dispatch({ type: "pickStudent", student: preselect.data, submissionId: newSubmissionId() });
  }

  useEffect(() => {
    if (preselected) focusQuietly(amountRef.current);
  }, [preselected]);

  const parsed = parseAmount(method, raw);
  const amount = parsed.ok ? parsed.amount : null;

  const pick = (s: Student) => {
    pendingFocus.current = "amount";
    dispatch({ type: "pickStudent", student: s, submissionId: newSubmissionId() });
  };

  const changeStudent = () => {
    if (saving) return;
    pendingFocus.current = "search";
    dispatch({ type: "changeStudent", submissionId: newSubmissionId() });
  };

  const setMethod = (m: Method) => dispatch({ type: "setMethod", method: m });

  const save = async () => {
    if (inFlight.current || status === "saved") return;
    if (!student) {
      focusQuietly(searchRef.current);
      return;
    }
    if (!parsed.ok) {
      dispatch({ type: "invalid", message: parsed.message });
      focusQuietly(amountRef.current);
      return;
    }
    inFlight.current = true;
    dispatch({ type: "saveStart" });
    try {
      const log = await createLog(
        { id: state.submissionId, studentId: student.id, ...parsed.amount },
        student,
      );
      pendingFocus.current = "next";
      dispatch({ type: "saveSucceeded", log });
    } catch (e) {
      pendingFocus.current = "save";
      dispatch({ type: "saveFailed", reason: e instanceof SubmissionConflictError ? "conflict" : "network" });
    } finally {
      inFlight.current = false;
    }
  };

  const next = () => {
    pendingFocus.current = "search";
    dispatch({ type: "nextStudent", submissionId: newSubmissionId() });
  };

  const another = () => {
    pendingFocus.current = "amount";
    dispatch({ type: "anotherForSame", submissionId: newSubmissionId() });
  };

  useHotkeys({
    "/": () => focusQuietly(student && status !== "saved" ? amountRef.current : searchRef.current),
    Escape: () => {
      if (!student || saving || status === "saved") return false;
      changeStudent();
    },
    Enter: (e) => {
      // Buttons and links handle their own Enter.
      if (status !== "saved" || isTypingTarget(e.target)) return false;
      if (e.target instanceof HTMLElement && e.target.closest("button, a")) return false;
      next();
    },
  });

  const prompt = !student
    ? "Pick a student, then enter an amount."
    : raw.trim() === ""
      ? method === "cans"
        ? `Enter a can count for ${student.firstName}.`
        : `Enter the cash amount for ${student.firstName}.`
      : "Fix the amount above to continue.";

  const cashEquivalent =
    amount?.method === "cash" ? canEquivalents(0, amount.cashCents) : null;

  return (
    <div className="grid gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_340px] min-[900px]:gap-10">
      <div className="min-w-0 max-w-[900px]">
        <h1 className="font-display text-[44px] leading-[.9] font-black uppercase md:text-[52px]">
          Log a donation
        </h1>
        <p className="mt-2 text-[15px] text-body">
          Find the student, check their homeroom, then enter what they brought.
        </p>

        <div className="mt-7">
          {status === "saved" && state.saved && student ? (
            <SavedReceipt
              log={state.saved}
              student={student}
              demo={demo}
              nextRef={nextRef}
              onNext={next}
              onAnother={another}
            />
          ) : (
            <>
              <ol className="space-y-8">
                <Step n={1} done={!!student} title="Student">
                  {student ? (
                    <ConfirmBlock student={student} onChange={changeStudent} disabled={saving} />
                  ) : (
                    <StudentSearch inputRef={searchRef} onPick={pick} autoFocus />
                  )}
                </Step>

                <Step n={2} done={!!student} title="Cans or cash?" titleId={methodTitleId}>
                  <MethodPicker
                    labelledBy={methodTitleId}
                    value={method}
                    onChange={setMethod}
                    disabled={saving || !student}
                  />
                </Step>

                <Step
                  n={3}
                  done={!!student && parsed.ok}
                  title={
                    <label htmlFor={amountId}>{method === "cans" ? "How many cans?" : "How much cash?"}</label>
                  }
                >
                  <AmountInput
                    id={amountId}
                    inputRef={amountRef}
                    method={method}
                    value={raw}
                    onChange={(v) => dispatch({ type: "setRaw", raw: v })}
                    onMethodChange={setMethod}
                    onSubmit={save}
                    onEscape={changeStudent}
                    invalid={!!fieldError}
                    describedBy={fieldError ? `${errorId} ${hintId}` : hintId}
                    disabled={saving || !student}
                  />
                  {fieldError && <FieldError id={errorId}>{fieldError}</FieldError>}
                  {!fieldError && amount && isLargeAmount(amount) && (
                    <p className="mt-2 bg-butter px-2.5 py-1.5 text-[15px] font-semibold">
                      That’s a big one — double-check before saving.
                    </p>
                  )}
                  <p id={hintId} className="mt-2 text-[14px] text-muted">
                    {method === "cans" ? (
                      <>
                        Count each can once.
                        <span className="max-md:hidden"> ↑ ↓ adjusts by one. Type $ if it’s cash.</span>
                      </>
                    ) : (
                      <>
                        {cashEquivalent !== null
                          ? `Counts as ${cashEquivalent} can-equivalent${cashEquivalent === 1 ? "" : "s"} for the homeroom ($1 = 1 can).`
                          : "$1 counts as 1 can for the homeroom."}
                        <span className="max-md:hidden"> Type C if it’s cans.</span>
                      </>
                    )}
                  </p>
                </Step>
              </ol>

              <div className="mt-9 space-y-4">
                {status === "failed" && saveError && student && (
                  <SaveFailedBanner
                    reason={saveError}
                    amountText={amount ? formatAmount(amount) : raw}
                    student={student}
                    onRetry={save}
                  />
                )}
                <SaveBar
                  student={student}
                  amount={amount}
                  prompt={prompt}
                  saving={saving}
                  failed={status === "failed"}
                  onSave={save}
                  buttonRef={saveRef}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <aside aria-label="This session" className="min-w-0 space-y-8">
        <SessionList />
        <KeyboardHelp />
      </aside>
    </div>
  );
}
