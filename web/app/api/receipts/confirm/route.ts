import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase-server";
import { findVendorSuggestion } from "@/lib/vendor-lookup";

const SOURCE_TYPE = "receipt_upload";

type ConfirmPayload = {
  receiptId: string;
  occurredOn: string;
  amountYen: number;
  vendorName: string;
  description?: string;
  paymentMethodId: string;
  categoryId?: string | null;
  businessRatio?: number | null;
  isBusiness?: boolean | null;
};

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

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const body = (await request.json()) as ConfirmPayload;

    if (!body.receiptId) {
      return NextResponse.json({ error: "receiptId is required." }, { status: 400 });
    }

    if (!body.occurredOn) {
      return NextResponse.json({ error: "occurredOn is required." }, { status: 400 });
    }

    if (!Number.isFinite(body.amountYen) || body.amountYen === 0) {
      return NextResponse.json({ error: "amountYen is invalid." }, { status: 400 });
    }

    if (!body.paymentMethodId) {
      return NextResponse.json(
        { error: "paymentMethodId is required." },
        { status: 400 }
      );
    }

    if (!body.vendorName.trim()) {
      return NextResponse.json({ error: "vendorName is required." }, { status: 400 });
    }

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", body.receiptId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    const vendorSuggestion = await findVendorSuggestion(body.vendorName);

    const resolvedIsBusiness =
      body.isBusiness ??
      vendorSuggestion.isBusiness ??
      Boolean(vendorSuggestion.categoryId);

    const resolvedRatioRaw =
      body.businessRatio ??
      vendorSuggestion.businessRatio ??
      (resolvedIsBusiness ? 100 : 0);

    const resolvedRatio = Math.min(
      100,
      Math.max(0, Math.round(resolvedRatioRaw))
    );

    const resolvedCategoryId = resolvedIsBusiness
      ? body.categoryId ?? vendorSuggestion.categoryId
      : null;

    const normalizedAmount = body.amountYen < 0
      ? Math.round(body.amountYen)
      : -Math.abs(Math.round(body.amountYen));

    const vendorRaw = body.vendorName.trim();
    const vendorNorm = normalizeVendor(vendorRaw);

    const { data: source, error: sourceError } = await supabase
      .from("import_sources")
      .insert({
        source_type: SOURCE_TYPE,
        metadata: {
          receipt_id: receipt.id,
          created_by: "receipt_upload",
        },
      })
      .select("id")
      .single();

    if (sourceError || !source) {
      throw sourceError || new Error("Failed to create import source.");
    }

    const fingerprint = buildFingerprint(
      body.occurredOn,
      normalizedAmount,
      body.paymentMethodId,
      vendorNorm
    );

    const description = body.description?.trim() || vendorRaw;

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
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

    if (transactionError || !transaction) {
      throw transactionError || new Error("Failed to create transaction.");
    }

    const { error: infoError } = await supabase
      .from("transaction_business_info")
      .insert({
        transaction_id: transaction.id,
        is_business: resolvedIsBusiness,
        business_ratio: resolvedIsBusiness ? resolvedRatio : 0,
        category_id: resolvedIsBusiness ? resolvedCategoryId : null,
        judged_by: "receipt_upload",
        judged_at: new Date().toISOString(),
        audit_note: "Receipt review confirmation.",
      });

    if (infoError) {
      throw infoError;
    }

    const { error: receiptUpdateError } = await supabase
      .from("receipts")
      .update({ transaction_id: transaction.id })
      .eq("id", receipt.id);

    if (receiptUpdateError) {
      throw receiptUpdateError;
    }

    return NextResponse.json({ transactionId: transaction.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed.";
    console.error("Receipt confirmation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
