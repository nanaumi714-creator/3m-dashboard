import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";
import { runEdgeOcr } from "@/lib/ocr-edge";
import { runGoogleVisionOcr } from "@/lib/google-vision";
import { Database } from "@/lib/database.types";

const MAX_MONTHLY_OCR_PAGES = Number(process.env.OCR_MONTHLY_LIMIT || "1000");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
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
    const accessToken = getAccessToken(request);

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId is required." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    let userId: string | null = null;
    let uploadClient = supabaseServer;

    if (accessToken) {
      if (!supabaseAnonKey) {
        return NextResponse.json(
          { error: "Supabase anon key is missing." },
          { status: 500 }
        );
      }

      const supabaseUser = createClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        }
      );
      const { data: authData, error: authError } =
        await supabaseUser.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        return NextResponse.json(
          { error: "Invalid session." },
          { status: 401 }
        );
      }

      userId = user.id;
      uploadClient = supabaseUser;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFilename(file.name || "receipt");
    const filename = `${crypto.randomUUID()}-${safeName}`;
    const storagePath = userId ? `${userId}/${filename}` : filename;

    const { error: uploadError } = await uploadClient.storage
      .from("receipts")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: receipt, error: insertError } = await supabaseServer
      .from("receipts")
      .insert({
        transaction_id: transactionId,
        storage_url: storagePath,
        original_filename: file.name || null,
        content_type: file.type || null,
        file_size_bytes: buffer.length,
        user_id: userId,
      })
      .select("*")
      .single();

    if (insertError || !receipt) {
      await uploadClient.storage.from("receipts").remove([storagePath]);
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
        const { text, confidence } = await runEdgeOcr(
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
