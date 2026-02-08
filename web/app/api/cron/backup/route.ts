import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/backup
 * 
 * Vercel Cron job for automated database backup.
 * Runs daily at 2:00 AM.
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: "Missing Supabase service role configuration." },
                { status: 500 }
            );
        }

        const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // Log backup start
        const backupTimestamp = new Date().toISOString();

        // Create backup record
        const { error: insertError } = await supabase
            .from("backups")
            .insert({
                backup_type: "automated",
                status: "completed",
                backup_timestamp: backupTimestamp,
                notes: "Daily automated backup via Vercel Cron"
            });
        if (insertError) throw insertError;

        // Supabase Cloud handles actual backups automatically
        // This just logs the backup checkpoint

        return NextResponse.json({
            success: true,
            message: "Backup logged successfully",
            timestamp: backupTimestamp
        });

    } catch (error) {
        console.error("Backup error:", error);
        return NextResponse.json(
            { error: "Failed to execute backup" },
            { status: 500 }
        );
    }
}
