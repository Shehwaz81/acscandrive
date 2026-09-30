import { NextResponse, type NextRequest } from "next/server";
import { NOT_FOUND_MESSAGE, NOT_YOURS_MESSAGE, parseClaimInput, parseDeleteInput } from "@/lib/claims";
import { createClaim, deleteClaim, listClaims } from "@/lib/claims.server";

/*
 * Public street claims. No login: each handler enforces its own rules, and
 * responses carry only PublicClaim fields ("First L. (HR)", never IDs).
 * No rate limit or CAPTCHA (known limit, see docs/architecture.md).
 */

const NO_STORE = { "Cache-Control": "no-store" };
const INVALID = "Check the street and your details, then try again.";

/** GET /api/claims → PublicClaim[], sorted by street. */
export async function GET() {
  try {
    return NextResponse.json(await listClaims(), { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Claims are unavailable right now." }, { status: 502 });
  }
}

/**
 * POST /api/claims  { name, homeroom, placeId, address, lat, lng }
 * 200 { claim } (also when this student already holds it), 409 { error, claim }
 * when someone else does, 404 for an unknown student.
 */
export async function POST(request: NextRequest) {
  const input = parseClaimInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: INVALID }, { status: 400 });
  try {
    const result = await createClaim(input);
    switch (result.status) {
      case "claimed":
        return NextResponse.json({ claim: result.claim }, { headers: NO_STORE });
      case "taken":
        return NextResponse.json({ error: "taken", claim: result.claim }, { status: 409 });
      case "unknown-student":
        return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "The claim couldn't be saved. Try again." }, { status: 502 });
  }
}

/**
 * DELETE /api/claims  { placeId, name, homeroom }
 * 200 when deleted or already gone, 403 when the claim is someone else's.
 */
export async function DELETE(request: NextRequest) {
  const input = parseDeleteInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: INVALID }, { status: 400 });
  try {
    if ((await deleteClaim(input)) === "forbidden") {
      return NextResponse.json({ error: NOT_YOURS_MESSAGE }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "The claim couldn't be deleted. Try again." }, { status: 502 });
  }
}
