import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase-server";
import { Database } from "@/lib/database.types";
import { runGoogleVisionOcr } from "@/lib/ocr/google-vision";
import { extractReceiptFields } from "@/lib/receipt-extract";

const MAX_MONTHLY_OCR_PAGES = Number(process.env.OCR_MONTHLY_LIMIT || "1000");

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

async function getMonthlyOcrUsage(supabase: any, userId: string) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ocr_usage_logs")
    .select("pages, receipts!inner(user_id)")
    .eq("receipts.user_id", userId)
    .gte("request_at", start.toISOString());

  if (error) {
    throw error;
  }

  return (data || []).reduce(
    (sum: number, row: { pages: number | null }) => sum + (row.pages || 0),
    0
  );
}

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  let supabase = createServerClient();
  let userId: string | null = null;

  const accessToken = getAccessToken(request);
  const { data: authData, error: authError } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : { data: { user: null }, error: null };

  if (authError) {
    console.error("Auth error:", authError);
  }

  if (authData.user) {
    userId = authData.user.id;
  } else if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
    // Fallback for local development without auth
    console.warn("Auth disabled: Using service role for receipt upload.");
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey) {
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      // Use the seed.sql dev user ID or a fallback
      userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    } else {
      console.error("SUPABASE_SERVICE_ROLE_KEY not set.");
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized: Please log in or set service role key." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const runOcr = formData.get("runOcr") !== "false";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = await ensureUploadDir();
    const safeName = sanitizeFilename(file.name || "receipt");
    const filename = `${crypto.randomUUID()}-${safeName}`;
    const fullPath = path.join(uploadDir, filename);
    await fs.writeFile(fullPath, (buffer as any));

    const storageUrl = `/uploads/${filename}`;

    const { data: receipt, error: insertError } = await supabase
      .from("receipts")
      .insert({
        user_id: userId,
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
      const usedPages = await getMonthlyOcrUsage(supabase, userId);
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

        const { error: updateError } = await supabase
          .from("receipts")
          .update({ ocr_text: text, ocr_confidence: confidence })
          .eq("id", receipt.id);

        if (updateError) {
          throw updateError;
        }

        const { error: logError } = await (supabase as any)
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
        await (supabase as any).from("ocr_usage_logs").insert({
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

    const [paymentMethodResult, categoryResult] = await Promise.all([
      supabase
        .from("payment_methods")
        .select("name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("expense_categories")
        .select("name")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (paymentMethodResult.error) {
      throw paymentMethodResult.error;
    }

    if (categoryResult.error) {
      throw categoryResult.error;
    }

    const extraction = ocrText
      ? await extractReceiptFields(ocrText, {
        categoryList: (categoryResult.data ?? []).map((row) => row.name),
        paymentMethodList: (paymentMethodResult.data ?? []).map((row) => row.name),
      })
      : {
        occurredOn: null,
        amountYen: null,
        vendorName: null,
        description: null,
        categoryHint: null,
        paymentMethodHint: null,
        memo: null,
        source: "fallback" as const,
      };

    return NextResponse.json({
      receipt,
      ocr: { text: ocrText, confidence: ocrConfidence },
      extraction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("Receipt intake error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
