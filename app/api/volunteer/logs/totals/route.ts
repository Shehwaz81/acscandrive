import { NextResponse, type NextRequest } from "next/server";
import { getVolunteer } from "@/lib/auth/session";
import { getStudentTotals, isStudentId } from "@/lib/volunteer/logs.server";

/** GET /api/volunteer/logs/totals?studentId=123 → StudentTotals, summed from the logs. */
export async function GET(request: NextRequest) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!isStudentId(studentId)) return NextResponse.json({ error: "Invalid studentId." }, { status: 400 });
  try {
    return NextResponse.json(await getStudentTotals(studentId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Totals are unavailable." }, { status: 502 });
  }
}
