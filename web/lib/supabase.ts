import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Phase 1: Local only, so we can hardcode the check or provide a default for local dev convenience
// However, proper .env setup is recommended.
// Checking if key is empty to avoid hydration errors or client creation failures
if (!supabaseAnonKey && process.env.NODE_ENV !== "development") {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
}

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey
);
