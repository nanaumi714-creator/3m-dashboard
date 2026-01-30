import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { supabaseServer } from "@/lib/supabase-server";
import { runEdgeOcr } from "@/lib/ocr-edge";

const MAX_MONTHLY_OCR_PAGES = Number(process.env.OCR_MONTHLY_LIMIT || "1000");

async function getMonthlyOcrUsage() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseServer
    .from("ocr_usage_logs")
    .select("pages")
    .gte("request_at", start.toISOString());

  if (error) throw error;

  return (data || []).reduce((sum, row) => sum + (row.pages || 0), 0);
}

async function loadReceiptFile(storageUrl: string) {
  if (storageUrl.startsWith("http")) {
    const response = await fetch(storageUrl);
    if (!response.ok) {
      throw new Error("Failed to download receipt file.");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const localPath = path.join(process.cwd(), "public", storageUrl);
  return fs.readFile(localPath);
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const receiptId = params.id;
    const { data: receipt, error } = await supabaseServer
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

    const usedPages = await getMonthlyOcrUsage();
    if (usedPages >= MAX_MONTHLY_OCR_PAGES) {
      return NextResponse.json(
        { error: "OCR monthly limit reached." },
        { status: 429 }
      );
    }

    const buffer = await loadReceiptFile(receipt.storage_url);
    const { text, confidence } = await runEdgeOcr(
      buffer.toString("base64"),
      receipt.content_type || null
    );

    const { error: updateError } = await supabaseServer
      .from("receipts")
      .update({ ocr_text: text, ocr_confidence: confidence })
      .eq("id", receipt.id);

    if (updateError) {
      throw updateError;
    }

    const { error: logError } = await supabaseServer
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
    await supabaseServer.from("ocr_usage_logs").insert({
      receipt_id: params.id,
      status: "failed",
      pages: 1,
      provider: "google_vision",
      error_message: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
