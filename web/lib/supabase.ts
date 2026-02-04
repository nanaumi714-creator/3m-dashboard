import { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "./database.types";

export const supabase: SupabaseClient<Database, "public"> =
  createClientComponentClient<Database, "public">();

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
