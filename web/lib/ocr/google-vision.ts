
import { runEdgeOcr } from "@/lib/ocr-edge";

export async function runGoogleVisionOcr(
    base64Image: string,
    mimeType: string | null
): Promise<{ text: string | null; confidence: number }> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (!apiKey) {
        console.warn("GOOGLE_VISION_API_KEY is not set. Falling back to Edge OCR.");
        const { text, confidence } = await runEdgeOcr(base64Image, mimeType);
        return { text: text || null, confidence: confidence ?? 0 };
    }

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const body = {
        requests: [
            {
                image: {
                    content: base64Image,
                },
                features: [
                    {
                        type: "TEXT_DETECTION",
                    },
                ],
            },
        ],
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Google Vision API Error:", errorData);
            throw new Error(`Google Vision API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const annotations = data.responses?.[0]?.textAnnotations;

        if (!annotations || annotations.length === 0) {
            return { text: null, confidence: 0 };
        }

        // The first annotation contains the full text
        const fullText = annotations[0].description;

        // Calculate simple confidence (average of word confidences if available, or default)
        // Note: Google Vision API for simple TEXT_DETECTION doesn't always provide per-word confidence in the same way DOCUMENT_TEXT_DETECTION does.
        // We'll return a placeholder confidence or derived from block/page limits if needed.
        // For now, returning 1.0 if successful as standard TEXT_DETECTION is usually high confidence if it returns text.

        return { text: fullText, confidence: 1.0 };

    } catch (error) {
        console.error("runGoogleVisionOcr failed. Falling back to Edge OCR:", error);
        const { text, confidence } = await runEdgeOcr(base64Image, mimeType);
        return { text: text || null, confidence: confidence ?? 0 };
    }
}
