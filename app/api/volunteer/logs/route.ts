import { NextResponse, type NextRequest } from "next/server";
import { getVolunteer } from "@/lib/auth/session";
import { InvalidLogError, createLog, isStudentId, listStudentLogs, parseNewLog } from "@/lib/volunteer/logs.server";
import { SubmissionConflictError } from "@/lib/volunteer/repository";

const PRIVATE = { "Cache-Control": "private, no-store" };

/** GET /api/volunteer/logs?studentId=123 → DonationLog[], newest first. */
export async function GET(request: NextRequest) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!isStudentId(studentId)) return NextResponse.json({ error: "Invalid studentId." }, { status: 400 });
  try {
    return NextResponse.json(await listStudentLogs(studentId), { headers: PRIVATE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Logs are unavailable." }, { status: 502 });
  }
}

/**
 * POST /api/volunteer/logs  body: NewLog → DonationLog.
 * Retry-safe: the same id and payload returns the saved log again; the same id
 * with a different payload is 409.
 */
export async function POST(request: NextRequest) {
  if (!(await getVolunteer())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = parseNewLog(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Invalid donation." }, { status: 400 });
  try {
    return NextResponse.json(await createLog(input), { headers: PRIVATE });
  } catch (e) {
    if (e instanceof SubmissionConflictError) return NextResponse.json({ error: "conflict" }, { status: 409 });
    if (e instanceof InvalidLogError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "The donation could not be saved." }, { status: 502 });
  }
}
