import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key-for-build";

// Phase 1: Local only, so we can hardcode the check or provide a default for local dev convenience
// However, proper .env setup is recommended.
// Note: During build, if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing, we use a dummy key to avoid build failures.
// The client-side will have proper keys when running in the browser.
if (typeof window === "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Using dummy key for build.");
}

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey
);
