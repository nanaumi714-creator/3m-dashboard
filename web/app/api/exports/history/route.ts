import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
    try {
        const { data, error } = await supabaseServer
            .from("export_history")
            .select("*, export_templates(name)")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch export history.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
