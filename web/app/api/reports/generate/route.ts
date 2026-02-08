import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * POST /api/reports/generate
 * 
 * Generate custom reports with filters.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const body = await request.json();

        const { format, filters } = body;

        // Build query
        let query = supabase
            .from("transactions")
            .select(`
        *,
        transaction_business_info (
          is_business,
          business_ratio
        ),
        expense_categories (name),
        payment_methods (name),
        vendors (name)
      `);

        if (filters.startDate) {
            query = query.gte("occurred_on", filters.startDate);
        }

        if (filters.endDate) {
            query = query.lte("occurred_on", filters.endDate);
        }

        if (filters.minAmount) {
            query = query.gte("amount_yen", parseInt(filters.minAmount));
        }

        if (filters.maxAmount) {
            query = query.lte("amount_yen", parseInt(filters.maxAmount));
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter business only if requested
        let transactions = data || [];
        if (filters.isBusinessOnly) {
            transactions = transactions.filter(
                (t: any) => t.transaction_business_info?.is_business
            );
        }

        // Generate report based on format
        if (format === "csv") {
            const csv = generateCSV(transactions);
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="report_${new Date().toISOString()}.csv"`
                }
            });
        }

        // TODO: Implement Excel and PDF generation
        return NextResponse.json({ error: "Format not yet implemented" }, { status: 501 });

    } catch (error) {
        console.error("Report generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}

function generateCSV(transactions: any[]): string {
    const headers = ["日付", "内容", "支払先", "金額", "カテゴリ", "事業", "按分率"];
    const rows = transactions.map((t) => [
        t.occurred_on,
        t.description,
        t.vendors?.name || "",
        t.amount_yen,
        t.expense_categories?.name || "",
        t.transaction_business_info?.is_business ? "〇" : "",
        t.transaction_business_info?.business_ratio || ""
    ]);

    return [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");
}
