"use client";

import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { useLookalikes, useStudentLogs } from "@/lib/volunteer/provider";
import { fullName } from "@/lib/volunteer/search";
import { formatTime, isTodayToronto } from "@/lib/volunteer/time";
import { gradeText, type Student } from "@/lib/volunteer/types";
import { BTN_SECONDARY, KBD, MONO_LABEL } from "@/lib/volunteer/ui";

/**
 * The picked student, big enough to check at a glance, plus two guards:
 * lookalike names in the school and anything already logged today.
 */
export function ConfirmBlock({
  student,
  onChange,
  disabled,
}: {
  student: Student;
  onChange: () => void;
  disabled: boolean;
}) {
  const lookalikes = useLookalikes(student);
  const logs = useStudentLogs(student.id);
  const today = (logs.data ?? []).filter((l) => isTodayToronto(l.createdAt));

  return (
    <div>
      <div className="flex flex-col border-[3px] border-ink bg-field md:flex-row">
        <div className="min-w-0 flex-1 px-4 py-4 md:px-5">
          <p className={`${MONO_LABEL} text-muted`}>Recording for</p>
          <p className="mt-1 font-display text-[40px] leading-[.95] font-black break-words md:text-[46px]">
            {fullName(student)}
          </p>
          <p className="mt-1.5 text-[15px] text-body">{gradeText(student.grade)}</p>
        </div>
        <div className="flex items-baseline gap-3 bg-ink px-4 py-3 text-paper md:flex-col md:items-start md:justify-center md:gap-1 md:px-6 md:py-4">
          <p className={`${MONO_LABEL} text-rule`}>Homeroom</p>
          <p className="font-display text-[40px] leading-none font-black text-butter md:text-[56px]">
            {student.homeroom}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[14px]">
        {lookalikes.data.length > 0 && (
          <p className="bg-butter px-2.5 py-1.5 font-semibold">
            Check — also in school:{" "}
            {lookalikes.data.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                {fullName(s)} ({s.homeroom})
              </span>
            ))}
          </p>
        )}
        <p className="text-body" aria-live="polite">
          {!logs.data ? (
            "Checking today’s logs…"
          ) : today.length ? (
            <>
              <strong className="text-ink">Already logged today:</strong>{" "}
              {today.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && " · "}
                  {formatAmount(logAmount(l))} at {formatTime(l.createdAt)}
                </span>
              ))}
            </>
          ) : (
            `Nothing logged for ${student.firstName} today yet.`
          )}
        </p>
      </div>

      <button type="button" onClick={onChange} disabled={disabled} className={`${BTN_SECONDARY} mt-3`}>
        Change student
        <kbd className={KBD} aria-hidden>
          Esc
        </kbd>
      </button>
    </div>
  );
}
