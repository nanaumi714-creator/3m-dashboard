export type ReceiptExtract = {
  occurredOn: string | null;
  amountYen: number | null;
  vendorName: string | null;
  source: "llm" | "fallback";
};

type OpenAiMessage = {
  role: "system" | "user";
  content: string;
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/(\d{4})[\/-]?(\d{1,2})[\/-]?(\d{1,2})/);
  if (!match) return null;
  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "number" ? String(value) : value;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(Math.round(parsed));
}

function extractFallback(ocrText: string): ReceiptExtract {
  const dateMatch = ocrText.match(/(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/);
  const amountMatches = Array.from(
    ocrText.matchAll(/(?:¥|￥)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{2,})\s*(?:円|JPY)?/g)
  ).map((match) => match[1].replace(/,/g, ""));
  const amountValue = amountMatches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  const vendorMatch = ocrText.split("\n").find((line) => line.trim().length > 1) || null;

  return {
    occurredOn: normalizeDate(dateMatch?.[1] ?? null),
    amountYen: normalizeAmount(amountValue ?? null),
    vendorName: vendorMatch ? vendorMatch.trim().slice(0, 40) : null,
    source: "fallback",
  };
}

function parseJsonCandidate(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export async function extractReceiptFields(
  ocrText: string
): Promise<ReceiptExtract> {
  const trimmedText = ocrText.trim();
  if (!trimmedText) {
    return {
      occurredOn: null,
      amountYen: null,
      vendorName: null,
      source: "fallback",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return extractFallback(trimmedText);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages: OpenAiMessage[] = [
    {
      role: "system",
      content:
        "You extract structured receipt data. Return JSON only with keys: occurredOn (YYYY-MM-DD or null), amountYen (number or null), vendorName (string or null).",
    },
    {
      role: "user",
      content: `OCR text:\n${trimmedText}`,
    },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return extractFallback(trimmedText);
    }

    const data = (await response.json()) as OpenAiResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return extractFallback(trimmedText);
    }

    const json = parseJsonCandidate(content);
    if (!json) {
      return extractFallback(trimmedText);
    }

    const occurredOn = normalizeDate(
      typeof json.occurredOn === "string" ? json.occurredOn : null
    );
    const amountYen = normalizeAmount(
      typeof json.amountYen === "number" || typeof json.amountYen === "string"
        ? (json.amountYen as string | number)
        : null
    );
    const vendorName =
      typeof json.vendorName === "string" ? json.vendorName.trim() : null;

    return {
      occurredOn,
      amountYen,
      vendorName: vendorName || null,
      source: "llm",
    };
  } catch (error) {
    console.error("LLM extraction failed", error);
    return extractFallback(trimmedText);
  }
}
