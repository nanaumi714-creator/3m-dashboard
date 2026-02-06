import { NextResponse } from "next/server";
import { runGoogleVisionOcr } from "@/lib/ocr/google-vision";
import { extractReceiptFields } from "@/lib/receipt-extract";
import { createServerClient } from "@/lib/supabase-server";

type NameOption = {
  id: string;
  name: string;
};

function resolveHintId(hintName: string | null, options: NameOption[]): string | null {
  if (!hintName) {
    return null;
  }
  const exact = options.find((option) => option.name === hintName);
  return exact?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const supabase = createServerClient();

    const [paymentMethodResult, categoryResult] = await Promise.all([
      supabase
        .from("payment_methods")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("expense_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (paymentMethodResult.error) {
      throw paymentMethodResult.error;
    }

    if (categoryResult.error) {
      throw categoryResult.error;
    }

    const paymentMethods = (paymentMethodResult.data ?? []) as NameOption[];
    const categories = (categoryResult.data ?? []) as NameOption[];

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString("base64");

    const { text: ocrText, confidence: ocrConfidence } = await runGoogleVisionOcr(
      base64Image,
      file.type || null
    );

    const extraction = ocrText
      ? await extractReceiptFields(ocrText, {
          categoryList: categories.map((category) => category.name),
          paymentMethodList: paymentMethods.map((method) => method.name),
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

    const matchedCategoryId = resolveHintId(extraction.categoryHint, categories);
    const matchedPaymentMethodId = resolveHintId(
      extraction.paymentMethodHint,
      paymentMethods
    );

    return NextResponse.json({
      ocr: { text: ocrText, confidence: ocrConfidence },
      extraction,
      hints: {
        matchedCategoryId,
        matchedPaymentMethodId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    console.error("Receipt analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
