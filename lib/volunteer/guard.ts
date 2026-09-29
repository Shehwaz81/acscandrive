import "server-only";
import { redirect } from "next/navigation";
import { getVolunteer } from "@/lib/auth/session";

/**
 * Protected-area check for /volunteer: only a signed-in admin (a row in
 * public.admin) gets through. Returns their username.
 *
 * Call it in every server action and route handler that reads or writes
 * volunteer data, not just the layout. A layout check doesn't protect actions,
 * which can be called directly.
 */
export async function requireVolunteer(): Promise<string> {
  const username = await getVolunteer();
  if (!username) redirect("/login");
  return username;
}
