import { NextResponse, type NextRequest } from "next/server";
import { getVolunteer } from "@/lib/auth/session";
import { loadRoster } from "@/lib/volunteer/roster.server";
import { searchStudents } from "@/lib/volunteer/search";

const MAX_QUERY = 100;

/** GET /api/volunteer/students?q=maya → StudentSearchResult (capped, names only). */
export async function GET(request: NextRequest) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, MAX_QUERY);
  try {
    const result = searchStudents(await loadRoster(), q);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Student search is unavailable." }, { status: 502 });
  }
}
