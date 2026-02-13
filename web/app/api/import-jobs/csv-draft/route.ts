import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const IMPORT_JOB_SOURCE_TYPE = "import_job_csv";
const DRAFT_STATUS_PENDING = 0;

type DraftInput = {
  sourceRowNumber: number;
  occurredOn: string | null;
  amountYen: number | null;
  description: string | null;
  vendorRaw: string | null;
  vendorNorm: string | null;
  paymentMethodId: string | null;
};

type CreateCsvDraftPayload = {
  fileName: string;
  checksum: string;
  drafts: DraftInput[];
  aiExecuted?: boolean;
};

type ImportDraftMetadata = {
  id: string;
  status: number;
  source_row_number: number;
  occurred_on: string | null;
  amount_yen: number | null;
  description: string | null;
  vendor_raw: string | null;
  vendor_norm: string | null;
  payment_method_id: string | null;
  committed_transaction_id: string | null;
  committed_at: string | null;
};

type ImportJobMetadata = {
  schema_version: number;
  original_source_type: "csv";
  file_name: string;
  checksum: string;
  ai_executed: boolean;
  drafts: ImportDraftMetadata[];
};

function toImportJobMetadata(payload: CreateCsvDraftPayload): ImportJobMetadata {
  const drafts: ImportDraftMetadata[] = payload.drafts.map((draft) => ({
    id: crypto.randomUUID(),
    status: DRAFT_STATUS_PENDING,
    source_row_number: draft.sourceRowNumber,
    occurred_on: draft.occurredOn,
    amount_yen: draft.amountYen,
    description: draft.description,
    vendor_raw: draft.vendorRaw,
    vendor_norm: draft.vendorNorm,
    payment_method_id: draft.paymentMethodId,
    committed_transaction_id: null,
    committed_at: null,
  }));

  return {
    schema_version: 1,
    original_source_type: "csv",
    file_name: payload.fileName,
    checksum: payload.checksum,
    ai_executed: payload.aiExecuted ?? false,
    drafts,
  };
}

function parseMetadata(value: unknown): ImportJobMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.drafts)) {
    return null;
  }

  return value as ImportJobMetadata;
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as CreateCsvDraftPayload;
    if (!payload.fileName || !payload.checksum || !Array.isArray(payload.drafts) || payload.drafts.length === 0) {
      return NextResponse.json(
        { error: "fileName/checksum/drafts are required." },
        { status: 400 }
      );
    }

    const { data: existingSource, error: existingError } = await supabase
      .from("import_sources")
      .select("id, metadata, imported_at")
      .eq("source_type", IMPORT_JOB_SOURCE_TYPE)
      .eq("checksum", payload.checksum)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingSource) {
      const parsed = parseMetadata(existingSource.metadata);
      return NextResponse.json({
        jobId: existingSource.id,
        metadata: parsed,
        importedAt: existingSource.imported_at,
        reused: true,
      });
    }

    const metadata = toImportJobMetadata(payload);

    const { data, error } = await supabase
      .from("import_sources")
      .insert({
        user_id: user.id,
        source_type: IMPORT_JOB_SOURCE_TYPE,
        file_path: payload.fileName,
        checksum: payload.checksum,
        metadata,
      })
      .select("id, metadata, imported_at")
      .single();

    if (error || !data) {
      throw error || new Error("Failed to create import job.");
    }

    return NextResponse.json({
      jobId: data.id,
      metadata: parseMetadata(data.metadata),
      importedAt: data.imported_at,
      reused: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create draft.";
    console.error("CSV draft creation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
