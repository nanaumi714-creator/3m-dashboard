import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const { data: receipt, error } = await supabase
      .from("receipts")
      .select("storage_url")
      .eq("id", params.id)
      .single();

    if (error || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found." },
        { status: 404 }
      );
    }

    const { data, error: signError } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receipt.storage_url, 60 * 10);

    if (signError || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    console.error("Receipt download error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
