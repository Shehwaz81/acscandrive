import { NextResponse, type NextRequest } from "next/server";
import { getVolunteer } from "@/lib/auth/session";
import { getRosterStudent } from "@/lib/volunteer/roster.server";

/** GET /api/volunteer/students/123 → Student, or 404. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/volunteer/students/[id]">) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const student = await getRosterStudent(id);
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(student, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Student lookup is unavailable." }, { status: 502 });
  }
}
