import {
  AuthChangeEvent,
  Session,
  createClient
} from "@supabase/supabase-js";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key-for-build";
const authStorageKey = "sb-auth-token";

// Phase 1: Local only, so we can hardcode the check or provide a default for local dev convenience
// However, proper .env setup is recommended.
// Note: During build, if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing, we use a dummy key to avoid build failures.
// The client-side will have proper keys when running in the browser.
if (typeof window === "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Using dummy key for build.");
}

const cookieStorage: Storage = {
  getItem(key) {
    if (typeof document === "undefined") return null;
    const cookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${key}=`));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
  },
  setItem(key, value) {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 7;
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; secure"
        : "";
    document.cookie = `${key}=${encodeURIComponent(
      value
    )}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
  },
  removeItem(key) {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
  },
  clear() {
    if (typeof document === "undefined") return;
    document.cookie.split("; ").forEach((cookie) => {
      const [cookieKey] = cookie.split("=");
      document.cookie = `${cookieKey}=; path=/; max-age=0; samesite=lax`;
    });
  },
  key(index) {
    if (typeof document === "undefined") return null;
    const keys = document.cookie
      .split("; ")
      .filter(Boolean)
      .map((cookie) => cookie.split("=")[0]);
    return keys[index] ?? null;
  },
  get length() {
    if (typeof document === "undefined") return 0;
    return document.cookie.split("; ").filter(Boolean).length;
  }
};

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        storageKey: authStorageKey,
        storage: cookieStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
);

export async function getClientSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signOut() {
  return supabase.auth.signOut();
}
