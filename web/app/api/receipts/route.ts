import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { runGoogleVisionOcr } from "@/lib/google-vision";

const MAX_MONTHLY_OCR_PAGES = Number(process.env.OCR_MONTHLY_LIMIT || "1000");

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

async function getMonthlyOcrUsage() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseServer
    .from("ocr_usage_logs")
    .select("pages")
    .gte("request_at", start.toISOString());

  if (error) {
    throw error;
  }

  return (data || []).reduce((sum, row) => sum + (row.pages || 0), 0);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const transactionId = formData.get("transactionId");
    const file = formData.get("file");
    const runOcr = formData.get("runOcr") === "true";

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId is required." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = await ensureUploadDir();
    const safeName = sanitizeFilename(file.name || "receipt");
    const filename = `${crypto.randomUUID()}-${safeName}`;
    const fullPath = path.join(uploadDir, filename);
    await fs.writeFile(fullPath, buffer);

    const storageUrl = `/uploads/${filename}`;

    const { data: receipt, error: insertError } = await supabaseServer
      .from("receipts")
      .insert({
        transaction_id: transactionId,
        storage_url: storageUrl,
        original_filename: file.name || null,
        content_type: file.type || null,
        file_size_bytes: buffer.length,
      })
      .select("*")
      .single();

    if (insertError || !receipt) {
      throw insertError || new Error("Failed to create receipt.");
    }

    let ocrText: string | null = null;
    let ocrConfidence: number | null = null;

    if (runOcr) {
      const usedPages = await getMonthlyOcrUsage();
      if (usedPages >= MAX_MONTHLY_OCR_PAGES) {
        return NextResponse.json(
          { error: "OCR monthly limit reached." },
          { status: 429 }
        );
      }

      try {
        const { text, confidence } = await runGoogleVisionOcr(
          buffer.toString("base64"),
          file.type || null
        );
        ocrText = text;
        ocrConfidence = confidence;

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
      } catch (error) {
        const message = error instanceof Error ? error.message : "OCR failed.";
        await supabaseServer.from("ocr_usage_logs").insert({
          receipt_id: receipt.id,
          status: "failed",
          pages: 1,
          provider: "google_vision",
          error_message: message,
        });

        return NextResponse.json(
          { error: message, receipt },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      receipt,
      ocr: { text: ocrText, confidence: ocrConfidence },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("Receipt upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
