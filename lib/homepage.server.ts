import "server-only";
import { buildHomepageData, type HomepageData, type LogRow } from "./homepage";
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
 * "First L." names for today's top donors. No student IDs.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const [students, logs] = await Promise.all([loadRoster(), loadLogs()]);
  return buildHomepageData(students, logs, DRIVE.goal);
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
