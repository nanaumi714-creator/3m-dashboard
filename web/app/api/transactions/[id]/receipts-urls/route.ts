import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    // 1) Fetch receipt storage paths for the transaction.
    const { data: receipts, error: receiptsError } = await supabase
      .from("receipts")
      .select("id, storage_url")
      .eq("transaction_id", params.id);

    if (receiptsError) throw receiptsError;

    if (!receipts || receipts.length === 0) {
      return NextResponse.json({ urls: {} });
    }

    // 2) Create signed URLs for receipt files.
    const paths = receipts.map((r) => r.storage_url);
    const { data, error: signError } = await supabase.storage
      .from("receipts")
      .createSignedUrls(paths, 60 * 10);

    if (signError || !data) {
      throw signError || new Error("Failed to create signed URLs.");
    }

    // 3) Map receipt id -> signed URL.
    const urls: Record<string, string> = {};
    receipts.forEach((receipt) => {
      const signedItem = data.find((d) => d.path === receipt.storage_url);
      if (signedItem?.signedUrl) {
        urls[receipt.id] = signedItem.signedUrl;
      }
    });

    return NextResponse.json({ urls });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Batch URL generation failed.";
    console.error("Batch receipts-urls error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}