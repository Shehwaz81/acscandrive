import { NextResponse, type NextRequest } from "next/server";
import { getStandingsProfile } from "@/lib/standings/standings.server";

/**
 * GET /api/standings/students/<ref> → StudentProfile: totals, today, reward
 * progress and donation history (date, method, amount). Public by the owner's
 * decision. 404 for an unknown, altered or foreign ref.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/standings/students/[ref]">) {
  const { ref } = await ctx.params;
  try {
    const profile = await getStandingsProfile(ref);
    if (!profile) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Student details aren't available right now." }, { status: 502 });
  }
}
