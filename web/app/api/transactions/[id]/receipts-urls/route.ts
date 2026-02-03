import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // 1. 取引に紐づく証憑一覧を取得
        const { data: receipts, error: receiptsError } = await supabaseServer
            .from("receipts")
            .select("id, storage_url")
            .eq("transaction_id", params.id);

        if (receiptsError) throw receiptsError;

        if (!receipts || receipts.length === 0) {
            return NextResponse.json({ urls: {} });
        }

        // 2. ストレージパスの一覧を作成
        const paths = receipts.map((r) => r.storage_url);

        // 3. 一括で署名付きURLを生成 (Supabase Storage の createSignedUrls を使用)
        const { data, error: signError } = await supabaseServer.storage
            .from("receipts")
            .createSignedUrls(paths, 60 * 10);

        if (signError || !data) {
            throw signError || new Error("Failed to create signed URLs.");
        }

        // 4. Receipt ID と Signed URL のマッピングを作成
        const urls: Record<string, string> = {};
        receipts.forEach((receipt) => {
            const signedItem = data.find((d) => d.path === receipt.storage_url);
            if (signedItem?.signedUrl) {
                urls[receipt.id] = signedItem.signedUrl;
            }
        });

        return NextResponse.json({ urls });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Batch URL generation failed.";
        console.error("Batch receipts-urls error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
