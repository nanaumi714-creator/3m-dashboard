import { NextResponse } from "next/server";
import { runGoogleVisionOcr } from "@/lib/ocr/google-vision";
import { extractReceiptFields } from "@/lib/receipt-extract";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "file is required." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Image = buffer.toString("base64");

        // Run OCR (Non-persistent)
        const { text: ocrText, confidence: ocrConfidence } = await runGoogleVisionOcr(
            base64Image,
            file.type || null
        );

        // Extract fields using LLM or fallback
        const extraction = ocrText
            ? await extractReceiptFields(ocrText)
            : {
                occurredOn: null,
                amountYen: null,
                vendorName: null,
                source: "fallback" as const,
            };

        return NextResponse.json({
            ocr: { text: ocrText, confidence: ocrConfidence },
            extraction,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Analysis failed.";
        console.error("Receipt analysis error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
