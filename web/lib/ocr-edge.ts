type OcrEdgeResponse = {
  text: string;
  confidence: number | null;
};

type OcrEdgeError = {
  error: string;
};

export async function runEdgeOcr(
  base64Content: string,
  mimeType: string | null
): Promise<OcrEdgeResponse> {
  const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY is not set.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/ocr-processor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ base64Content, mimeType }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as OcrEdgeError | null;
    const message =
      body?.error || `Edge OCR error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (await response.json()) as OcrEdgeResponse;
}
