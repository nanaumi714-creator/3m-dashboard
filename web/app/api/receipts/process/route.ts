import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { findVendorSuggestion } from "@/lib/vendor-lookup";
import { createServerClient } from "@/lib/supabase-server";
import { Database } from "@/lib/database.types";

const SOURCE_TYPE = "receipt_upload";

type TransactionData = {
    occurredOn: string;
    amountYen: number;
    vendorName: string;
    description?: string;
    paymentMethodId: string;
    categoryId?: string | null;
    businessRatio?: number | null;
    isBusiness?: boolean | null;
};

// --- Helper Functions ---

function sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureUploadDir() {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    return uploadDir;
}

function normalizeVendor(raw: string): string {
    return raw
        .slice(0, 30)
        .normalize("NFKC")
        .replace(/[\s\p{P}\p{S}]/gu, "")
        .toLowerCase();
}

function buildFingerprint(
    occurredOn: string,
    amountYen: number,
    paymentMethodId: string,
    vendorNorm: string
) {
    return crypto
        .createHash("sha256")
        .update([occurredOn, amountYen, paymentMethodId, vendorNorm, SOURCE_TYPE].join("|"))
        .digest("hex");
}

function getAccessToken(request: Request) {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice("Bearer ".length).trim() || null;
}

async function getSupabaseClient(request: Request) {
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
        console.warn("Auth disabled: Using service role for receipt process.");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
            const { createClient } = await import("@supabase/supabase-js");
            supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
            userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // Fallback user
        }
    }
    return { supabase, userId };
}

// --- Main Handler ---

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const ocrText = formData.get("ocrText") as string | null;
        const transactionJson = formData.get("transactionData") as string;

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "file is required." }, { status: 400 });
        }
        if (!transactionJson) {
            return NextResponse.json({ error: "transactionData is required." }, { status: 400 });
        }

        const { supabase, userId } = await getSupabaseClient(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const body = JSON.parse(transactionJson) as TransactionData;

        // --- Validation ---
        if (!body.occurredOn || !body.amountYen || !body.paymentMethodId || !body.vendorName.trim()) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        // 1. Save File
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = await ensureUploadDir();
        const safeName = sanitizeFilename(file.name || "receipt");
        const filename = `${crypto.randomUUID()}-${safeName}`;
        const fullPath = path.join(uploadDir, filename);
        await fs.writeFile(fullPath, new Uint8Array(buffer));
        const storageUrl = `/uploads/${filename}`;

        // 2. Insert Receipt
        const { data: receipt, error: receiptError } = await supabase
            .from("receipts")
            .insert({
                user_id: userId,
                storage_url: storageUrl,
                original_filename: file.name || null,
                content_type: file.type || null,
                file_size_bytes: buffer.length,
                ocr_text: ocrText,
                ocr_confidence: null, // We could pass this too if needed, but keeping it simple
            })
            .select("id")
            .single();

        if (receiptError || !receipt) {
            throw receiptError || new Error("Failed to create receipt.");
        }

        // 3. Logic from confirm/route.ts (Create Transaction)
        const vendorSuggestion = await findVendorSuggestion(body.vendorName);

        const resolvedIsBusiness = body.isBusiness ?? vendorSuggestion.isBusiness ?? Boolean(vendorSuggestion.categoryId);
        const resolvedRatioRaw = body.businessRatio ?? vendorSuggestion.businessRatio ?? (resolvedIsBusiness ? 100 : 0);
        const resolvedRatio = Math.min(100, Math.max(0, Math.round(resolvedRatioRaw)));
        const resolvedCategoryId = body.categoryId ?? vendorSuggestion.categoryId ?? null;

        // Negate amount for expense
        const normalizedAmount = body.amountYen < 0 ? Math.round(body.amountYen) : -Math.abs(Math.round(body.amountYen));

        const vendorRaw = body.vendorName.trim();
        const vendorNorm = normalizeVendor(vendorRaw);

        // Create Import Source
        const { data: source, error: sourceError } = await supabase
            .from("import_sources")
            .insert({
                source_type: SOURCE_TYPE,
                user_id: userId,
                metadata: {
                    receipt_id: receipt.id,
                    created_by: "receipt_upload_v2",
                },
            })
            .select("id")
            .single();

        if (sourceError || !source) throw sourceError;

        const fingerprint = buildFingerprint(body.occurredOn, normalizedAmount, body.paymentMethodId, vendorNorm);
        const description = body.description?.trim() || vendorRaw;

        // Create Transaction
        const { data: transaction, error: transactionError } = await supabase
            .from("transactions")
            .insert({
                user_id: userId,
                occurred_on: body.occurredOn,
                amount_yen: normalizedAmount,
                description,
                payment_method_id: body.paymentMethodId,
                import_source_id: source.id,
                vendor_raw: vendorRaw,
                vendor_norm: vendorNorm,
                vendor_id: vendorSuggestion.vendorId,
                fingerprint,
            })
            .select("id")
            .single();

        if (transactionError || !transaction) throw transactionError;

        // Create Business Info (Only if is_business is NOT null/undefined)
        if (body.isBusiness !== null && body.isBusiness !== undefined) {
            const { error: infoError } = await supabase
                .from("transaction_business_info")
                .insert({
                    transaction_id: transaction.id,
                    is_business: resolvedIsBusiness,
                    business_ratio: resolvedIsBusiness ? resolvedRatio : 0,
                    category_id: resolvedCategoryId,
                    judged_by: "receipt_upload_v2",
                    judged_at: new Date().toISOString(),
                    audit_note: "Receipt review confirmed (v2).",
                });

            if (infoError) throw infoError;
        }

        // 4. Link Receipt to Transaction
        const { error: updateError } = await supabase
            .from("receipts")
            .update({ transaction_id: transaction.id })
            .eq("id", receipt.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, transactionId: transaction.id });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Process failed.";
        console.error("Receipt process error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
