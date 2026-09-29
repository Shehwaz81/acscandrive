import "server-only";
import { redirect } from "next/navigation";
import { DATA_SOURCE } from "./index";

/**
 * Protected-area check for /volunteer. STUB: there is no login yet.
 *
 * With mock data there is nothing private to protect, so everyone is let in.
 * With the Supabase data source the stub refuses everyone rather than expose
 * real student names.
 *
 * TODO(auth): create a request-scoped client (lib/supabase/server.ts), call
 * supabase.auth.getClaims(), and allow only a user whose claims carry the
 * volunteer role; otherwise redirect to the login page. Being signed in is not
 * enough, and RLS must enforce the same rule for every query.
 */
export async function requireVolunteer(): Promise<void> {
  if (DATA_SOURCE === "mock") return;
  redirect("/");
}
