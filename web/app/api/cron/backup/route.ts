import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

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

        const supabase = createServerClient();

        // Log backup start
        const backupTimestamp = new Date().toISOString();

        // Create backup record
        await supabase
            .from("backups")
            .insert({
                backup_type: "automated",
                status: "completed",
                backup_timestamp: backupTimestamp,
                notes: "Daily automated backup via Vercel Cron"
            });

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
