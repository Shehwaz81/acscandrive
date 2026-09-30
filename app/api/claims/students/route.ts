import { NextResponse, type NextRequest } from "next/server";
import { suggestStudents } from "@/lib/claims.server";

/**
 * GET /api/claims/students?q=maya → StudentOption[] ({ ref, label }), at most
 * 8, for the claim name picker. Public by the owner's decision (claims run on
 * trust): it reveals "First L. (HR)" for names that match what was typed,
 * never ids or surnames. Fewer than 2 letters returns [].
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  try {
    return NextResponse.json(await suggestStudents(q), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Name search isn't available right now." }, { status: 502 });
  }
}
