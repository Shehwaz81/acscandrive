import "server-only";
import { teacherLabels } from "../homepage";
import { createAdminClient } from "../supabase/admin";
import { toStudent } from "../volunteer/roster.server";
import type { Student } from "../volunteer/types";
import {
  buildIndex,
  buildStandingsData,
  buildStudentProfile,
  searchStandings,
  type StandingsIndex,
  type StandingsLog,
} from "./build";
import { openStudentRef, sealStudentRef } from "./ref";
import type { SearchResult, StandingsData, StudentProfile } from "./types";

/**
 * Loads the Student Standings from Supabase. There is no login and the admin
 * client bypasses RLS, so this module is the boundary: private rows are read
 * here and only the shapes in `types.ts` leave. Students are named by sealed
 * refs; ids, transaction ids and `recorded_at` never leave.
 */

/** PostgREST returns at most 1,000 rows per request by default. */
const PAGE = 1000;
/**
 * Search and profile requests each need every log (a result shows its
 * all-time rank), and anyone can send them. Rows are reused for this long so
 * typing a name is one read of the tables, not one per keystroke.
 */
const REUSE_MS = 15_000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  // Fail closed: without a strong secret anyone could forge a student ref.
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  return value;
}

async function loadStudents(): Promise<{ students: Student[]; teachers: Map<string, string> }> {
  const db = createAdminClient();
  const rows: { student_id: number; first_name: string; last_name: string; grade: number; hr: string; hr_teacher: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("students")
      .select("student_id, first_name, last_name, grade, hr, hr_teacher")
      .order("student_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't read students: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { students: rows.map(toStudent), teachers: teacherLabels(rows) };
}

/** Every counted log, by keyset like the homepage; `transaction_id` is only the paging cursor. */
async function loadLogs(): Promise<StandingsLog[]> {
  const db = createAdminClient();
  const all: StandingsLog[] = [];
  let after: string | null = null;
  for (;;) {
    let q = db
      .from("donation_logs")
      .select("transaction_id, student_id, method, can_count, amount_cents, occurred_at")
      .in("method", ["cans", "cash"])
      .order("transaction_id")
      .limit(PAGE);
    if (after) q = q.gt("transaction_id", after);
    const { data, error } = await q;
    if (error) throw new Error(`Couldn't read donation logs: ${error.message}`);
    for (const l of data) {
      all.push({
        student_id: l.student_id,
        method: l.method,
        can_count: l.can_count,
        amount_cents: l.amount_cents,
        occurred_at: l.occurred_at,
      });
    }
    if (data.length < PAGE) return all;
    after = data[data.length - 1].transaction_id;
  }
}

/**
 * Confirmed dodgeball places by homeroom. The table is an unapplied draft
 * (supabase/drafts/dodgeball_places.sql): until it exists, no place is confirmed.
 */
async function loadPlaces(): Promise<Map<string, number>> {
  // Not in the generated types while it is a draft.
  const db = createAdminClient() as unknown as {
    from(table: string): {
      select(columns: string): PromiseLike<{
        data: { hr: string; place: number }[] | null;
        error: { code?: string; message: string } | null;
      }>;
    };
  };
  const { data, error } = await db.from("dodgeball_places").select("hr, place");
  if (error) {
    // PGRST205 / 42P01: the table doesn't exist.
    if (error.code === "PGRST205" || error.code === "42P01") return new Map();
    throw new Error(`Couldn't read dodgeball places: ${error.message}`);
  }
  return new Map((data ?? []).map((r) => [r.hr, r.place]));
}

type Loaded = { index: StandingsIndex; places: Map<string, number> };

async function load(): Promise<Loaded> {
  const [{ students, teachers }, logs, places] = await Promise.all([loadStudents(), loadLogs(), loadPlaces()]);
  return { index: buildIndex(students, logs, new Date(), teachers), places };
}

let recent: { at: number; loaded: Promise<Loaded> } | null = null;

function loadRecent(): Promise<Loaded> {
  if (recent && Date.now() - recent.at < REUSE_MS) return recent.loaded;
  const entry = { at: Date.now(), loaded: load() };
  // A failed read is not reused: the next request tries again.
  entry.loaded.catch(() => {
    if (recent === entry) recent = null;
  });
  recent = entry;
  return entry.loaded;
}

/**
 * The podium and the all-time table, fetched once by `app/students/page.tsx`
 * (rebuilt at most once a minute).
 */
export async function getStandingsData(): Promise<StandingsData> {
  const key = secret();
  const { index } = await load();
  return buildStandingsData(index, (id) => sealStudentRef(id, key));
}

/** Public roster search for the route handler. */
export async function searchStandingsStudents(query: string): Promise<SearchResult> {
  const key = secret();
  const { index } = await loadRecent();
  return searchStandings(index, query, (id) => sealStudentRef(id, key));
}

/** A student's public profile, or null for an unknown, altered or foreign ref. */
export async function getStandingsProfile(ref: string): Promise<StudentProfile | null> {
  const key = secret();
  const id = openStudentRef(ref, key);
  if (id === null) return null;
  const { index, places } = await loadRecent();
  return buildStudentProfile(index, id, (s) => sealStudentRef(s, key), places);
}
