export type ReceiptExtract = {
  occurredOn: string | null;
  amountYen: number | null;
  vendorName: string | null;
  description: string | null;
  categoryHint: string | null;
  paymentMethodHint: string | null;
  memo: string | null;
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

type ExtractContext = {
  categoryList: string[];
  paymentMethodList: string[];
};

type LlmItem = {
  name?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
};

type LlmReceipt = {
  occurred_on?: string;
  total_amount?: number;
  vendor_name?: string;
  memo?: string;
  category?: string;
  payment_method?: string;
};

type LlmPayload = {
  receipt?: LlmReceipt;
  items?: LlmItem[];
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

function containsUnknownOption(list: string[]): string | null {
  const unknown = list.find((entry) => entry.toLowerCase() === "unknown");
  return unknown ?? null;
}

function normalizeCandidate(
  candidate: string | undefined,
  allowedList: string[]
): string | null {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const exact = allowedList.find((allowed) => allowed === trimmed);
  if (exact) {
    return exact;
  }

  const unknown = containsUnknownOption(allowedList);
  return unknown;
}

function sumItemTotals(items: LlmItem[] | undefined): number | null {
  if (!items || items.length === 0) return null;
  const totals = items
    .map((item) => normalizeAmount(item.line_total))
    .filter((value): value is number => Number.isFinite(value));

  if (totals.length === 0) return null;
  return totals.reduce((acc, value) => acc + value, 0);
}

function extractFallback(ocrText: string): ReceiptExtract {
  const dateMatch = ocrText.match(/(\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})/);
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
    vendorName: null,
    description: null,
    categoryHint: null,
    paymentMethodHint: null,
    memo: null,
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

const SYSTEM_PROMPT = `You are a data-normalization engine for Japanese receipt OCR.

Return ONLY valid JSON. No markdown, comments, or explanations.

Constraints:
- Output MUST conform exactly to the provided JSON schema.
- OCR text is in Japanese. Use it as-is; do NOT translate or rewrite it.
- Do NOT invent category names or payment methods.
- receipt.category MUST be one of the provided category list.
- receipt.payment_method MUST be one of the provided payment method list.
- If no valid value can be determined, use "unknown" ONLY if it exists in the provided list.
- All monetary values MUST be integers in JPY.
- Do NOT output null. Omit optional fields if unknown.

Normalization:
- Prices are tax-included (税込) unless explicitly stated otherwise.
- If quantity is missing, assume quantity = 1.
- If an item line includes a number (e.g. "牛乳 2"), interpret it as quantity.
- Do NOT merge identical item lines.
- If OCR text is partially garbled, infer conservatively using common Japanese receipt patterns.
- Do NOT guess missing dates, phone numbers, or store names. Omit them if unclear.

Consistency:
- If receipt totals are present, the sum of item prices MUST equal receipt.total_amount.
- If adjustment is required, modify ONLY the most ambiguous item prices.
- Any adjustment MUST be explained briefly in receipt.memo.`;

function buildUserPrompt(
  ocrText: string,
  categoryList: string[],
  paymentMethodList: string[]
): string {
  const categoryLines = categoryList.length > 0 ? categoryList.join("\n") : "(none)";
  const paymentMethodLines =
    paymentMethodList.length > 0 ? paymentMethodList.join("\n") : "(none)";

  return `Reference masters
Valid categories (select one):
${categoryLines}

Valid payment methods (select one):
${paymentMethodLines}

OCR text (Japanese, do not translate):
<<<
${ocrText}
>>>

Analyze the OCR text and output ONLY JSON that matches the provided schema.`;
}

export async function extractReceiptFields(
  ocrText: string,
  context: ExtractContext
): Promise<ReceiptExtract> {
  const trimmedText = ocrText.trim();
  if (!trimmedText) {
    return {
      occurredOn: null,
      amountYen: null,
      vendorName: null,
      description: null,
      categoryHint: null,
      paymentMethodHint: null,
      memo: null,
      source: "fallback",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set. Using fallback extraction.");
    return extractFallback(trimmedText);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const messages: OpenAiMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: buildUserPrompt(
        trimmedText,
        context.categoryList,
        context.paymentMethodList
      ),
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
        temperature: 1,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipt_extract",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                receipt: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    occurred_on: { type: "string" },
                    total_amount: { type: "number" },
                    vendor_name: { type: "string" },
                    memo: { type: "string" },
                    category: { type: "string" },
                    payment_method: { type: "string" },
                  },
                },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "number" },
                      unit_price: { type: "number" },
                      line_total: { type: "number" },
                    },
                  },
                },
              },
              required: ["receipt"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("OpenAI API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
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

    const payload = json as LlmPayload;
    const occurredOn = normalizeDate(payload.receipt?.occurred_on);
    const totalAmount = normalizeAmount(payload.receipt?.total_amount);
    const itemTotal = sumItemTotals(payload.items);
    const amountYen = totalAmount ?? itemTotal;

    const vendorName =
      typeof payload.receipt?.vendor_name === "string"
        ? payload.receipt.vendor_name.trim()
        : null;

    const memo =
      typeof payload.receipt?.memo === "string" ? payload.receipt.memo.trim() : null;

    const categoryHint = normalizeCandidate(
      payload.receipt?.category,
      context.categoryList
    );

    const paymentMethodHint = normalizeCandidate(
      payload.receipt?.payment_method,
      context.paymentMethodList
    );

    return {
      occurredOn,
      amountYen,
      vendorName: vendorName || null,
      description: memo || null,
      categoryHint,
      paymentMethodHint,
      memo: memo || null,
      source: "llm",
    };
  } catch (error) {
    console.error("LLM extraction failed", error);
    return extractFallback(trimmedText);
  }
}
