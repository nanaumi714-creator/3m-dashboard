export type ReceiptExtract = {
  occurredOn: string | null;
  amountYen: number | null;
  vendorName: string | null;
  description: string | null;
  categoryHint: string | null;
  paymentMethodHint: string | null;
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

  const today = new Date().toISOString().split('T')[0];

  return {
    occurredOn: normalizeDate(dateMatch?.[1] ?? null) || today,
    amountYen: normalizeAmount(amountValue ?? null),
    vendorName: vendorMatch ? vendorMatch.trim().slice(0, 40) : null,
    description: null,
    categoryHint: null,
    paymentMethodHint: null,
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

const SYSTEM_PROMPT = `あなたは日本のレシート・領収書からデータを抽出するアシスタントです。
以下のOCRテキストから情報を抽出し、JSON形式で返してください。

必須フィールド:
- occurredOn: 取引日（YYYY-MM-DD形式、不明ならnull）
- amountYen: 合計金額（数値、税込み合計を優先、不明ならnull）
- vendorName: 店舗名・取引先名（文字列、不明ならnull）

オプションフィールド:
- description: 購入内容の簡潔な説明（例: "コンビニ購入"、"ガソリン代"）
- categoryHint: 経費カテゴリの推測（例: "事務用品", "交通費", "会議費", "通信費"）
- paymentMethodHint: 支払い方法の推測（例: "現金", "カード", "電子マネー", "銀行振込", "QR決済"）

JSONのみを返してください。説明文は不要です。`;

export async function extractReceiptFields(
  ocrText: string
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
      content: `OCRテキスト:\n${trimmedText}`,
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
      const errorBody = await response.json().catch(() => ({}));
      console.error("OpenAI API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
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
    const description =
      typeof json.description === "string" ? json.description.trim() : null;
    const categoryHint =
      typeof json.categoryHint === "string" ? json.categoryHint.trim() : null;
    const paymentMethodHint =
      typeof json.paymentMethodHint === "string" ? json.paymentMethodHint.trim() : null;

    const today = new Date().toISOString().split('T')[0];

    return {
      occurredOn: occurredOn || today,
      amountYen,
      vendorName: vendorName || null,
      description: description || null,
      categoryHint: categoryHint || null,
      paymentMethodHint: paymentMethodHint || null,
      source: "llm",
    };
  } catch (error) {
    console.error("LLM extraction failed", error);
    return extractFallback(trimmedText);
  }
}
