import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRoster } from "@/lib/volunteer/roster.server";
import { searchStudents } from "@/lib/volunteer/search";
import {
  buildClaims,
  claimerLabel,
  MAX_OPTIONS,
  MIN_QUERY,
  toPublicClaim,
  type ClaimInput,
  type ClaimRow,
  type DeleteInput,
  type PublicClaim,
  type StudentOption,
} from "./claims";
import { openStudentRef, sealStudentRef } from "./claims-ref";

/**
 * Reads and writes `street_claims` for the public collection map.
 *
 * There is no login and the admin client bypasses RLS, so these functions are
 * the rules. Claims run on trust (owner, 2026-09-30): a student picks their
 * own name, and nothing proves they are that student. Only PublicClaim and
 * StudentOption leave this module: labels are "First L. (HR)" and students are
 * named by sealed refs, never ids or surnames.
 */

const CLAIM_COLUMNS = "place_id, address, lat, lng, students(first_name, last_name, hr)";
/** PostgREST returns at most 1,000 rows per request by default. */
const PAGE = 1000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  // Fail closed: without a strong secret anyone could forge a student ref.
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  return value;
}

export async function listClaims(): Promise<PublicClaim[]> {
  const db = createAdminClient();
  const rows: ClaimRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("street_claims")
      .select(CLAIM_COLUMNS)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't read claims: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return buildClaims(rows);
  }
}

/**
 * Name-picker suggestions: students whose name words start with the typed
 * words (the volunteer desk's search), at most MAX_OPTIONS, labelled
 * "First L. (HR)". Reads the roster (~1,100 rows) per search; the picker
 * debounces, and that is cheap at one school's scale.
 */
export async function suggestStudents(query: string): Promise<StudentOption[]> {
  if (query.replace(/\s/g, "").length < MIN_QUERY) return [];
  const { exact } = searchStudents(await loadRoster(), query);
  const key = secret();
  return exact.slice(0, MAX_OPTIONS).map((s) => ({ ref: sealStudentRef(Number(s.id), key), label: claimerLabel(s) }));
}

async function readClaim(placeId: string) {
  const { data, error } = await createAdminClient()
    .from("street_claims")
    .select(`student_id, ${CLAIM_COLUMNS}`)
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read claim: ${error.message}`);
  return data;
}

export type ClaimResult =
  | { status: "claimed"; claim: PublicClaim }
  | { status: "taken"; claim: PublicClaim }
  | { status: "bad-ref" }
  | { status: "unknown-student" };

/**
 * Claims a street once. The unique place_id decides races: the loser reads the
 * winner's row, and if it is the same student (a double click or retry) that
 * is still a success.
 */
export async function createClaim(input: ClaimInput): Promise<ClaimResult> {
  const studentId = openStudentRef(input.student, secret());
  if (studentId === null) return { status: "bad-ref" };

  const db = createAdminClient();
  // Two tries: if the row that beat us is deleted before we can read it, the street is open again.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await db
      .from("street_claims")
      .insert({ student_id: studentId, place_id: input.placeId, address: input.address, lat: input.lat, lng: input.lng })
      .select(CLAIM_COLUMNS)
      .single();
    if (!error) return { status: "claimed", claim: toPublicClaim(data) };
    // 23503: the student was removed from the roster after the ref was issued.
    if (error.code === "23503") return { status: "unknown-student" };
    if (error.code !== "23505") throw new Error(`Couldn't save claim: ${error.message}`);

    const existing = await readClaim(input.placeId);
    if (!existing) continue;
    const claim = toPublicClaim(existing);
    return existing.student_id === studentId ? { status: "claimed", claim } : { status: "taken", claim };
  }
  throw new Error("Claim kept changing while saving.");
}

/**
 * "deleted" also covers a claim that is already gone, so retries are safe.
 * "forbidden": the claim exists and the picked student isn't its claimer.
 */
export async function deleteClaim(input: DeleteInput): Promise<"deleted" | "forbidden" | "bad-ref"> {
  const studentId = openStudentRef(input.student, secret());
  if (studentId === null) return "bad-ref";
  const { data, error } = await createAdminClient()
    .from("street_claims")
    .delete()
    .eq("place_id", input.placeId)
    .eq("student_id", studentId)
    .select("id");
  if (error) throw new Error(`Couldn't delete claim: ${error.message}`);
  if (data.length > 0) return "deleted";
  return (await readClaim(input.placeId)) ? "forbidden" : "deleted";
}
