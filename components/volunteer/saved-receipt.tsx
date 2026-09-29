"use client";

import Link from "next/link";
import type { Ref } from "react";
import { Ticket } from "@/components/ticket";
import { formatAmount, logAmount } from "@/lib/volunteer/money";
import { fullName } from "@/lib/volunteer/search";
import { formatTime } from "@/lib/volunteer/time";
import type { DonationLog, Student } from "@/lib/volunteer/types";
import { BTN_PRIMARY, BTN_SECONDARY, KBD, MONO_LABEL } from "@/lib/volunteer/ui";

/** Shown only after the write is confirmed. */
export function SavedReceipt({
  log,
  student,
  demo,
  nextRef,
  onNext,
  onAnother,
}: {
  log: DonationLog;
  student: Student;
  demo: boolean;
  nextRef: Ref<HTMLButtonElement>;
  onNext: () => void;
  onAnother: () => void;
}) {
  return (
    <div>
      <div role="status">
        <Ticket
          stub={`SAVED · ${formatTime(log.createdAt)}`}
          className="max-w-[640px] -rotate-[0.6deg] bg-butter text-ink [--notch:12px]"
        >
          <div className="px-5 py-5 md:px-8 md:py-6">
            <p className={MONO_LABEL}>
              <span aria-hidden>✓ </span>Recorded
            </p>
            <p className="mt-3 font-display text-[64px] leading-[.9] font-black uppercase tabular-nums md:text-[88px]">
              {formatAmount(logAmount(log))}
            </p>
            <p className="mt-2 text-[18px]">
              for <strong>{fullName(student)}</strong>
            </p>
            <p className="text-[15px] text-body">
              Grade {student.grade} · Homeroom <strong className="text-ink">{student.homeroom}</strong>
            </p>
          </div>
        </Ticket>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button ref={nextRef} type="button" onClick={onNext} className={`${BTN_PRIMARY} mr-[5px] min-h-16 text-[18px]`}>
          Next student
          <kbd className={KBD} aria-hidden>
            ⏎
          </kbd>
        </button>
        <button type="button" onClick={onAnother} className={`${BTN_SECONDARY} min-h-12`}>
          Another for {student.firstName}
        </button>
        <Link
          href={`/volunteer?student=${student.id}&edit=${log.id}`}
          className="flex min-h-11 items-center px-2 text-[15px] font-semibold"
        >
          Wrong amount? Edit this log
        </Link>
      </div>
      {demo && <p className="mt-4 text-[13px] text-muted">Demo only — not sent to a database.</p>}
    </div>
  );
}
