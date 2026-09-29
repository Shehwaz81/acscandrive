"use client";

import Link from "next/link";
import { useStudentLogs, useStudentTotals } from "@/lib/volunteer/provider";
import { fullName } from "@/lib/volunteer/search";
import type { Student } from "@/lib/volunteer/types";
import { BTN_SECONDARY, MONO_LABEL } from "@/lib/volunteer/ui";
import { LogTable } from "./log-table";
import { TotalsStrip } from "./totals-strip";

export function StudentPanel({ student, editLogId }: { student: Student; editLogId: string | null }) {
  const logs = useStudentLogs(student.id);
  const totals = useStudentTotals(student.id);
  const name = fullName(student);

  return (
    <section aria-labelledby="student-panel-name" className="border-t-[3px] border-ink pt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={`${MONO_LABEL} text-muted`}>Student</p>
          <h2
            id="student-panel-name"
            className="mt-1 font-display text-[40px] leading-[.95] font-black break-words md:text-[44px]"
          >
            {name}
          </h2>
          <p className="mt-1.5 text-[15px] text-body">
            Grade {student.grade} · Homeroom <strong className="text-ink">{student.homeroom}</strong>
          </p>
        </div>
        <Link href={`/volunteer/log?student=${student.id}`} className={`${BTN_SECONDARY} min-h-12`}>
          Log a donation for {student.firstName} <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="mt-5">
        <TotalsStrip totals={totals.data} />
      </div>

      <div className="mt-6">
        <h3 className={`${MONO_LABEL} mb-2 text-muted`}>Logs</h3>
        {logs.error ? (
          <p role="alert" className="text-error">
            Couldn’t load logs. Reload the page to try again.
          </p>
        ) : logs.data ? (
          <LogTable logs={logs.data} studentName={name} initialEditId={editLogId} />
        ) : (
          <p className="py-6 text-muted">Loading logs…</p>
        )}
      </div>
    </section>
  );
}
