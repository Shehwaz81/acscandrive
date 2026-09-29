import "server-only";

/**
 * Protected-area check for /volunteer. STUB: there is no login yet.
 *
 * AUTH TODO — MERGE BLOCKER: this currently lets everyone in, including with
 * the Supabase data source, where the workspace searches the REAL roster
 * (app/api/volunteer/students). The owner chose to connect the roster first
 * and add volunteer login before merging. Before merge:
 *
 *   - create a request-scoped client (lib/supabase/server.ts), call
 *     supabase.auth.getClaims(), and allow only a user whose app_metadata
 *     carries the volunteer role; otherwise redirect to the login page;
 *   - make the same check at the top of every route handler under
 *     app/api/volunteer/ (they are reachable directly, not only via this page);
 *   - add the RLS policies drafted in supabase/drafts/volunteer_workspace.sql.
 *
 * Being signed in is not enough, and hiding the UI is not access control.
 */
export async function requireVolunteer(): Promise<void> {}
