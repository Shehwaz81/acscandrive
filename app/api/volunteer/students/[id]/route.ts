import { NextResponse, type NextRequest } from "next/server";
import { getRosterStudent } from "@/lib/volunteer/roster.server";

// AUTH TODO — MERGE BLOCKER: no volunteer check yet (see lib/volunteer/guard.ts).

/** GET /api/volunteer/students/123 → Student, or 404. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/volunteer/students/[id]">) {
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
