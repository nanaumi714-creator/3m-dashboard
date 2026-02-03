import { NextResponse } from "next/server";
import { Database } from "@/lib/database.types";
import { createServerClient } from "@/lib/supabase-server";

type ExportFilters = {
  query?: string;
  from?: string;
  to?: string;
  onlyUntriaged?: boolean;
  minAmount?: string;
  maxAmount?: string;
  categoryId?: string;
  includeOcr?: boolean;
};

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"] & {
  payment_methods: Database["public"]["Tables"]["payment_methods"]["Row"] | null;
  transaction_business_info:
    | Database["public"]["Tables"]["transaction_business_info"]["Row"]
    | null;
  receipts?: Array<Pick<Database["public"]["Tables"]["receipts"]["Row"], "ocr_text">>;
};

function toCsvValue(value: string | number | null) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/\"/g, "\"\"")}"`;
  }
  return stringValue;
}

function buildCsv(rows: Array<Record<string, string | number | null>>) {
  const headers = Object.keys(rows[0] || {});
  const headerLine = headers.map(toCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers.map((key) => toCsvValue(row[key])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    const { data: authData, error: userError } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : { data: { user: null }, error: null };
    if (userError) throw userError;
    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const filters = (await request.json()) as ExportFilters;

    let q = supabase
      .from("transactions")
      .select(
        "*, payment_methods(*), transaction_business_info(*), receipts(ocr_text)"
      );

    if (filters.query) {
      const searchFilters = [
        `description.ilike.%${filters.query}%`,
        `vendor_raw.ilike.%${filters.query}%`,
      ];
      if (filters.includeOcr) {
        searchFilters.push(`receipts.ocr_text.ilike.%${filters.query}%`);
      }
      q = q.or(searchFilters.join(","));
    }

    if (filters.from) q = q.gte("occurred_on", filters.from);
    if (filters.to) q = q.lte("occurred_on", filters.to);
    if (filters.minAmount) q = q.gte("amount_yen", Number(filters.minAmount));
    if (filters.maxAmount) q = q.lte("amount_yen", Number(filters.maxAmount));
    if (filters.categoryId) {
      q = q.eq("transaction_business_info.category_id", filters.categoryId);
    }

    const { data, error } = await q.order("occurred_on", { ascending: false });
    if (error) throw error;

    let rows = ((data || []) as unknown) as TransactionRow[];
    if (filters.onlyUntriaged) {
      rows = rows.filter((row) => !row.transaction_business_info);
    }

    const exportRows = rows.map((row) => {
      const ocrText = row.receipts?.map((r) => r.ocr_text).filter(Boolean).join("\n") || "";
      return {
        occurred_on: row.occurred_on,
        amount_yen: row.amount_yen,
        description: row.description,
        vendor_raw: row.vendor_raw,
        vendor_norm: row.vendor_norm,
        payment_method: row.payment_methods?.name || "",
        is_business: row.transaction_business_info?.is_business ?? null,
        business_ratio: row.transaction_business_info?.business_ratio ?? null,
        category_id: row.transaction_business_info?.category_id ?? null,
        ocr_text: ocrText,
      };
    });

    const csv = buildCsv(exportRows);

    const { data: history, error: historyError } = await supabase
      .from("export_history")
      .insert({
        format: "csv",
        filters: filters,
        row_count: exportRows.length,
        user_id: authData.user.id,
      })
      .select("*")
      .single();

    if (historyError) {
      throw historyError;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=transactions-${history.id}.csv`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    console.error("Export error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
