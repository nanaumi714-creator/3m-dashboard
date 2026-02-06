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
    const runAi = formData.get("runAi") === "true";
    const inputOcrText = formData.get("ocrText");
    const providedOcrText = typeof inputOcrText === "string" ? inputOcrText.trim() : null;

    if (!(file instanceof File) && !providedOcrText) {
      return NextResponse.json({ error: "file or ocrText is required." }, { status: 400 });
    }

    let ocrText: string | null = providedOcrText;
    let ocrConfidence: number | null = null;

    if (!ocrText && file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Image = buffer.toString("base64");

      const ocrResult = await runGoogleVisionOcr(
        base64Image,
        file.type || null
      );
      ocrText = ocrResult.text ?? null;
      ocrConfidence = ocrResult.confidence;
    }

    if (!runAi) {
      return NextResponse.json({
        ocr: { text: ocrText, confidence: ocrConfidence },
        extraction: {
          occurredOn: null,
          amountYen: null,
          vendorName: null,
          description: null,
          categoryHint: null,
          paymentMethodHint: null,
          memo: null,
          source: "fallback" as const,
        },
        hints: {
          matchedCategoryId: null,
          matchedPaymentMethodId: null,
        },
      });
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
