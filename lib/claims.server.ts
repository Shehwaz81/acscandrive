import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildClaims,
  matchStudent,
  toPublicClaim,
  type ClaimInput,
  type ClaimRow,
  type DeleteInput,
  type PublicClaim,
} from "./claims";

/**
 * Reads and writes `street_claims` for the public collection map.
 *
 * There is no login: the admin client bypasses RLS, so these functions are the
 * rules. Only PublicClaim leaves this module; student IDs and full surnames
 * stay here. Anyone who knows a classmate's name and homeroom can act in their
 * name (a known limit, see docs/architecture.md).
 */

const CLAIM_COLUMNS = "place_id, address, lat, lng, students(first_name, last_name, hr)";
/** PostgREST returns at most 1,000 rows per request by default. */
const PAGE = 1000;

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

/** The one student with this full name in this homeroom, or null (none, or more than one). */
async function findStudent(name: string, homeroom: string): Promise<number | null> {
  // The homeroom comes from a <select> of the roster's own `hr` values. A
  // homeroom is a few dozen students, so the name is matched in memory with the
  // normalization the tests cover.
  const { data, error } = await createAdminClient()
    .from("students")
    .select("student_id, first_name, last_name, hr")
    .eq("hr", homeroom);
  if (error) throw new Error(`Couldn't read students: ${error.message}`);
  return matchStudent(data, name, homeroom)?.student_id ?? null;
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
  | { status: "unknown-student" };

/**
 * Claims a street once. The unique place_id decides races: the loser reads the
 * winner's row, and if it is the same student (a double click or retry) that
 * is still a success.
 */
export async function createClaim(input: ClaimInput): Promise<ClaimResult> {
  const studentId = await findStudent(input.name, input.homeroom);
  if (studentId === null) return { status: "unknown-student" };

  const db = createAdminClient();
  // Two tries: if the row that beat us is deleted before we can read it, the street is open again.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await db
      .from("street_claims")
      .insert({ student_id: studentId, place_id: input.placeId, address: input.address, lat: input.lat, lng: input.lng })
      .select(CLAIM_COLUMNS)
      .single();
    if (!error) return { status: "claimed", claim: toPublicClaim(data) };
    // 23503: the student was removed between the lookup and the insert.
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
 * "forbidden" means the claim exists and this name and homeroom aren't its
 * claimer (including an unknown student); the reason is not revealed.
 */
export async function deleteClaim(input: DeleteInput): Promise<"deleted" | "forbidden"> {
  const studentId = await findStudent(input.name, input.homeroom);
  if (studentId !== null) {
    const { data, error } = await createAdminClient()
      .from("street_claims")
      .delete()
      .eq("place_id", input.placeId)
      .eq("student_id", studentId)
      .select("id");
    if (error) throw new Error(`Couldn't delete claim: ${error.message}`);
    if (data.length > 0) return "deleted";
  }
  return (await readClaim(input.placeId)) ? "forbidden" : "deleted";
}
