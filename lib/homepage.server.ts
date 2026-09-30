import "server-only";
import { buildHomepageData, type HomepageData, type LogRow, type TeacherRow, teacherLabels } from "./homepage";
import { DRIVE } from "./site";
import { createAdminClient } from "./supabase/admin";
import { loadRoster } from "./volunteer/roster.server";

export type { HomepageData };

/** PostgREST returns at most 1,000 rows per request by default. */
const PAGE = 1000;

/**
 * Everything the homepage shows, fetched once by `app/page.tsx` (rebuilt at
 * most once a minute, see `revalidate` there).
 *
 * Reads private rows with the admin client, which bypasses RLS. That is safe
 * here only because nothing private leaves: the result is passed to client
 * components, so it ends up in the browser, and it holds aggregates plus
 * "First L." names for today's top donors, each homeroom's teacher surname
 * (owner's decision) and per-grade daily totals for Grade Wars. No student IDs.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const [students, logs, teachers] = await Promise.all([loadRoster(), loadLogs(), loadTeachers()]);
  return buildHomepageData(students, logs, DRIVE.goal, new Date(), teacherLabels(teachers));
}

/** Room and teacher for every student, in pages; only the homepage reads hr_teacher. */
async function loadTeachers(): Promise<TeacherRow[]> {
  const db = createAdminClient();
  const all: TeacherRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("students")
      .select("hr, hr_teacher")
      .order("student_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't read homeroom teachers: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

/**
 * Every counted log, in pages. `online` stays out until refunds are defined.
 * Pages continue after the last id seen (keyset), not at an offset: a log
 * saved mid-read can't shift rows between pages and be counted twice.
 */
async function loadLogs(): Promise<LogRow[]> {
  const db = createAdminClient();
  const all: LogRow[] = [];
  let after: string | null = null;
  for (;;) {
    let q = db
      .from("donation_logs")
      .select("transaction_id, student_id, can_count, amount_cents, occurred_at")
      .in("method", ["cans", "cash"])
      .order("transaction_id")
      .limit(PAGE);
    if (after) q = q.gt("transaction_id", after);
    const { data, error } = await q;
    if (error) throw new Error(`Couldn't read donation logs: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE) return all;
    after = data[data.length - 1].transaction_id;
  }
}
