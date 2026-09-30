import { NextResponse, type NextRequest } from "next/server";
import { getVolunteer } from "@/lib/auth/session";
import { deleteLog, isLogId, parseLogPatch, updateLog } from "@/lib/volunteer/logs.server";

/** PATCH /api/volunteer/logs/<uuid>  body: LogPatch → DonationLog (direct overwrite), or 404. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/volunteer/logs/[id]">) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await ctx.params;
  const patch = parseLogPatch(await request.json().catch(() => null));
  if (!isLogId(id) || !patch) return NextResponse.json({ error: "Invalid change." }, { status: 400 });
  try {
    const log = await updateLog(id.toLowerCase(), patch);
    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(log, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "The change could not be saved." }, { status: 502 });
  }
}

/** DELETE /api/volunteer/logs/<uuid> → 204, also when the log is already gone (retry-safe). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/volunteer/logs/[id]">) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isLogId(id)) return NextResponse.json({ error: "Invalid log." }, { status: 400 });
  try {
    await deleteLog(id.toLowerCase());
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "The log could not be deleted." }, { status: 502 });
  }
}
