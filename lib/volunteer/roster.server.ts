import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Grade, Student } from "./types";

/**
 * Reads the real roster from `students` for the volunteer workspace.
 *
 * AUTH TODO — MERGE BLOCKER: there is no volunteer login yet, so nothing here
 * checks who is asking. The admin client bypasses RLS. Before this ships,
 * every caller must verify a signed-in volunteer first (see
 * lib/volunteer/guard.ts).
 *
 * Only the fields the workspace shows leave this module: no hr_teacher.
 */

const COLUMNS = "student_id, first_name, last_name, grade, hr";
/** PostgREST returns at most 1,000 rows per request by default; the roster is larger. */
const PAGE = 1000;

type Row = { student_id: number; first_name: string; last_name: string; grade: number; hr: string };

function toStudent(r: Row): Student {
  return {
    id: String(r.student_id),
    firstName: r.first_name,
    lastName: r.last_name,
    // The table's check constraint limits grade to 9–12.
    grade: r.grade as Grade,
    homeroom: r.hr,
  };
}

/** The whole roster (~1,100 rows), read in pages. Search runs over it in memory. */
export async function loadRoster(): Promise<Student[]> {
  const db = createAdminClient();
  const all: Student[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("students")
      .select(COLUMNS)
      .order("student_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't read students: ${error.message}`);
    all.push(...data.map(toStudent));
    if (data.length < PAGE) return all;
  }
}

export async function getRosterStudent(id: string): Promise<Student | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const { data, error } = await createAdminClient()
    .from("students")
    .select(COLUMNS)
    .eq("student_id", Number(id))
    .maybeSingle();
  if (error) throw new Error(`Couldn't read student: ${error.message}`);
  return data ? toStudent(data) : null;
}
