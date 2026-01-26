import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!supabaseServiceKey && process.env.NODE_ENV !== "development") {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing.");
}

export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
