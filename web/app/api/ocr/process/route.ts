import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * POST /api/ocr/process
 * 
 * Async OCR processing endpoint.
 * Accepts receipt image, queues OCR job, returns job ID.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const formData = await request.formData();

        const receiptId = formData.get("receipt_id") as string;

        if (!receiptId) {
            return NextResponse.json(
                { error: "receipt_id is required" },
                { status: 400 }
            );
        }

        // Check monthly limit
        const monthlyLimit = parseInt(process.env.OCR_MONTHLY_LIMIT || "100");
        const { data: user } = await supabase.auth.getUser();

        if (!user?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Count OCR requests this month
        const currentMonth = new Date().toISOString().substring(0, 7);
        const { count } = await supabase
            .from("ocr_requests")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.user.id)
            .gte("created_at", `${currentMonth}-01`);

        if ((count || 0) >= monthlyLimit) {
            return NextResponse.json(
                { error: "Monthly OCR limit exceeded" },
                { status: 429 }
            );
        }

        // Create OCR request record
        const { data: ocrRequest, error: insertError } = await supabase
            .from("ocr_requests")
            .insert({
                receipt_id: receiptId,
                user_id: user.user.id,
                status: "pending",
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // TODO: Queue background job (use Vercel scheduled functions or external queue)
        // For now, process synchronously (not ideal for production)

        return NextResponse.json({
            ocr_request_id: ocrRequest.id,
            status: "pending",
            message: "OCR processing queued"
        });

    } catch (error) {
        console.error("OCR processing error:", error);
        return NextResponse.json(
            { error: "Failed to process OCR request" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/ocr/process?receipt_id=xxx
 * 
 * Check OCR processing status.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const { searchParams } = new URL(request.url);
        const receiptId = searchParams.get("receipt_id");

        if (!receiptId) {
            return NextResponse.json(
                { error: "receipt_id is required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("ocr_requests")
            .select("*")
            .eq("receipt_id", receiptId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error("OCR status check error:", error);
        return NextResponse.json(
            { error: "Failed to check OCR status" },
            { status: 500 }
        );
    }
}
