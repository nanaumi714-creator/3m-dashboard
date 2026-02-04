import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { runEdgeOcr } from "@/lib/ocr-edge";

const MAX_MONTHLY_OCR_PAGES = Number(process.env.OCR_MONTHLY_LIMIT || "1000");

type ServerSupabaseClient = ReturnType<typeof createServerClient>;

async function getMonthlyOcrUsage(supabase: ServerSupabaseClient) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ocr_usage_logs")
    .select("pages")
    .gte("request_at", start.toISOString());

  if (error) throw error;

  return (data || []).reduce(
    (sum: number, row: { pages: number | null }) => sum + (row.pages || 0),
    0
  );
}

async function loadReceiptFile(supabase: ServerSupabaseClient, storageUrl: string) {
  const { data, error } = await supabase.storage
    .from("receipts")
    .download(storageUrl);

  if (error || !data) {
    throw error || new Error("Failed to download receipt file.");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  try {
    const receiptId = params.id;
    const { data: receipt, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", receiptId)
      .single();

    if (error || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found." },
        { status: 404 }
      );
    }

    const usedPages = await getMonthlyOcrUsage(supabase);
    if (usedPages >= MAX_MONTHLY_OCR_PAGES) {
      return NextResponse.json(
        { error: "OCR monthly limit reached." },
        { status: 429 }
      );
    }

    const buffer = await loadReceiptFile(supabase, receipt.storage_url);
    const { text, confidence } = await runEdgeOcr(
      buffer.toString("base64"),
      receipt.content_type || null
    );

    const { error: updateError } = await supabase
      .from("receipts")
      .update({ ocr_text: text, ocr_confidence: confidence })
      .eq("id", receipt.id);

    if (updateError) {
      throw updateError;
    }

    const { error: logError } = await supabase
      .from("ocr_usage_logs")
      .insert({
        receipt_id: receipt.id,
        status: "success",
        pages: 1,
        provider: "google_vision",
      });

    if (logError) {
      throw logError;
    }

    return NextResponse.json({ text, confidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed.";
    console.error("OCR rerun error:", error);
    await supabase.from("ocr_usage_logs").insert({
      receipt_id: params.id,
      status: "failed",
      pages: 1,
      provider: "google_vision",
      error_message: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
