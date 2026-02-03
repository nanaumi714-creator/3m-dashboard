import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const MAX_MONTHLY_OCR_PAGES = Number(process.env.OCR_MONTHLY_LIMIT || "1000");

function getMonthStart(): Date {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET() {
  try {
    const start = getMonthStart();
    const { data, error } = await supabaseServer
      .from("ocr_usage_logs")
      .select("pages")
      .gte("request_at", start.toISOString());

    if (error) {
      throw error;
    }

    const used = (data || []).reduce((sum, row) => sum + (row.pages || 0), 0);
    const remaining = Math.max(MAX_MONTHLY_OCR_PAGES - used, 0);

    return NextResponse.json({
      used,
      limit: MAX_MONTHLY_OCR_PAGES,
      remaining,
      periodStart: start.toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load OCR usage summary.";
    console.error("OCR usage summary error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
