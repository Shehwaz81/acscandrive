import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser client. Uses the publishable key, so RLS decides what it can see.
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
