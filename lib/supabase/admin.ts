import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Secret-key client that bypasses RLS. Callers must check authorization
// themselves and return only the fields a response is meant to expose.
export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
