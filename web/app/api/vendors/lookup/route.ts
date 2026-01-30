import { NextResponse } from "next/server";
import { findVendorSuggestion } from "@/lib/vendor-lookup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { vendorName?: string };
    if (!body.vendorName || typeof body.vendorName !== "string") {
      return NextResponse.json(
        { error: "vendorName is required." },
        { status: 400 }
      );
    }

    const suggestion = await findVendorSuggestion(body.vendorName);
    return NextResponse.json({ suggestion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed.";
    console.error("Vendor lookup error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
