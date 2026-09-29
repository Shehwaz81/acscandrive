import { NextResponse, type NextRequest } from "next/server";
import { loadRoster } from "@/lib/volunteer/roster.server";
import { searchStudents } from "@/lib/volunteer/search";

// AUTH TODO — MERGE BLOCKER: no volunteer check yet (see lib/volunteer/guard.ts).
// Anyone who can reach this URL can search the real roster.

const MAX_QUERY = 100;

/** GET /api/volunteer/students?q=maya → StudentSearchResult (capped, names only). */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, MAX_QUERY);
  try {
    const result = searchStudents(await loadRoster(), q);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Student search is unavailable." }, { status: 502 });
  }
}
