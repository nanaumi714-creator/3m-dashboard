import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase-server";
import { Database } from "@/lib/database.types";

type PreferencePayload = {
  categoryId: string;
  isVisible: boolean;
};

const DEV_FALLBACK_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

async function resolveClientAndUser() {
  let supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return { supabase, userId: user.id };
  }

  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Service role configuration is missing.");
    }

    supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { supabase, userId: DEV_FALLBACK_USER_ID };
  }

  return { supabase, userId: null };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreferencePayload;
    if (!body.categoryId) {
      return NextResponse.json({ error: "categoryId is required." }, { status: 400 });
    }

    const { supabase, userId } = await resolveClientAndUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_category_preferences")
      .upsert(
        {
          user_id: userId,
          category_id: body.categoryId,
          is_visible: body.isVisible,
        },
        { onConflict: "user_id,category_id" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preference.";
    console.error("Category preference update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
