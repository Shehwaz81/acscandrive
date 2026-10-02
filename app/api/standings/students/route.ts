import { NextResponse, type NextRequest } from "next/server";
import { DATA_SOURCE } from "@/lib/standings";
import { searchStandingsStudents } from "@/lib/standings/standings.server";

/**
 * GET /api/standings/students?q=maya → SearchResult (at most 8 items and the
 * number matched). Public by the owner's decision: full name, grade, homeroom,
 * teacher label and all-time total for names matching what was typed; students
 * are sealed refs, never ids. Fewer than 2 letters matches nothing. No rate
 * limit, like /api/claims/students (known limit, see docs/architecture.md).
 *
 * Answers 404 unless the standings data source is `supabase`, so real names
 * aren't served before the owner turns the page on.
 */
export async function GET(request: NextRequest) {
  if (DATA_SOURCE !== "supabase") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  try {
    return NextResponse.json(await searchStandingsStudents(q), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Student search isn't available right now." }, { status: 502 });
  }
}
