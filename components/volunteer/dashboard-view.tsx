"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { useStudent } from "@/lib/volunteer/provider";
import { BTN_PRIMARY, KBD } from "@/lib/volunteer/ui";
import { RecentLogs } from "./recent-logs";
import { StudentPanel } from "./student-panel";
import { StudentSearch } from "./student-search";
import { focusQuietly, useHotkeys } from "./use-hotkeys";

/** Look up a student, see their logs and totals, fix a log. Selection lives in the URL. */
export function DashboardView() {
  const router = useRouter();
  const params = useSearchParams();
  const studentId = params.get("student");
  const editId = params.get("edit");
  const student = useStudent(studentId);
  const searchRef = useRef<HTMLInputElement>(null);

  useHotkeys({ "/": () => focusQuietly(searchRef.current) });

  return (
    <div className="grid gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_340px] min-[900px]:gap-10">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-[44px] leading-[.9] font-black uppercase md:text-[52px]">
              Dashboard
            </h1>
            <p className="mt-2 text-[15px] text-body">Look up a student’s donations, or fix a log.</p>
          </div>
          <Link href="/volunteer/log" className={`${BTN_PRIMARY} mr-[5px] min-h-14`}>
            <span aria-hidden>+</span> Log a donation
            <kbd className={KBD} aria-hidden>
              L
            </kbd>
          </Link>
        </div>

        <div className="mt-7">
          <StudentSearch
            inputRef={searchRef}
            onPick={(s) => router.replace(`/volunteer?student=${s.id}`, { scroll: false })}
          />
        </div>

        <div className="mt-8">
          {!studentId ? (
            <p className="border-2 border-dashed border-rule px-5 py-10 text-center text-[15px] text-muted">
              No student selected — search above or pick from Recent logs.
            </p>
          ) : student.data ? (
            <StudentPanel key={student.data.id} student={student.data} editLogId={editId} />
          ) : student.loading ? (
            <p className="py-10 text-muted">Loading student…</p>
          ) : (
            <p className="border-2 border-dashed border-rule px-5 py-10 text-center text-[15px] text-muted">
              That student isn’t in the roster. Search above instead.
            </p>
          )}
        </div>
      </div>

      <aside aria-label="Recent activity" className="min-w-0">
        <RecentLogs />
      </aside>
    </div>
  );
}
