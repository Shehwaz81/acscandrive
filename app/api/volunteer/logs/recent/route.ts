import { NextResponse, type NextRequest } from "next/server";
import { getVolunteer } from "@/lib/auth/session";
import { listRecentLogs } from "@/lib/volunteer/logs.server";

/** The dashboard fetches 100 so its footer can count today's logs (components/volunteer/recent-logs.tsx). */
const MAX_LIMIT = 100;

/** GET /api/volunteer/logs/recent?limit=10 → LogWithStudent[], newest first. */
export async function GET(request: NextRequest) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 10, 1), MAX_LIMIT);
  try {
    return NextResponse.json(await listRecentLogs(limit), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Recent logs are unavailable." }, { status: 502 });
  }
}
