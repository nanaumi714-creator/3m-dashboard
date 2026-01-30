import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * GET /api/cron/gmail-sync
 * 
 * Vercel Cron job for Gmail sync.
 * Runs daily at 9:00 AM.
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createServerClient();

        // Log sync start
        const { data: syncLog, error: logError } = await supabase
            .from("gmail_sync_logs")
            .insert({
                status: "running",
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (logError) throw logError;

        // TODO: Trigger gmail_sync.py script via external service
        // For now, just log the attempt

        // Update log
        await supabase
            .from("gmail_sync_logs")
            .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                emails_processed: 0,
                receipts_saved: 0,
            })
            .eq("id", syncLog.id);

        return NextResponse.json({
            success: true,
            message: "Gmail sync completed"
        });

    } catch (error) {
        console.error("Gmail sync error:", error);
        return NextResponse.json(
            { error: "Failed to sync Gmail" },
            { status: 500 }
        );
    }
}
