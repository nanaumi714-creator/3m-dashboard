type VisionTextResult = {
  text: string;
  confidence: number | null;
};

type VisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{
        confidence?: number;
      }>;
    };
    textAnnotations?: Array<{
      description?: string;
    }>;
    error?: { message?: string };
  }>;
};

export async function runGoogleVisionOcr(
  base64Content: string,
  mimeType: string | null
): Promise<VisionTextResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is not set.");
  }

  const featureType =
    mimeType === "application/pdf" ? "DOCUMENT_TEXT_DETECTION" : "TEXT_DETECTION";

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Content },
            features: [{ type: featureType }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vision API error: ${response.status} ${body}`);
  }

  const data = (await response.json()) as VisionResponse;
  const result = data.responses?.[0];

  if (!result) {
    throw new Error("Vision API returned an empty response.");
  }

  if (result.error?.message) {
    throw new Error(`Vision API error: ${result.error.message}`);
  }

  const text =
    result.fullTextAnnotation?.text ||
    result.textAnnotations?.[0]?.description ||
    "";
  const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence ?? null;

  return { text, confidence };
}
