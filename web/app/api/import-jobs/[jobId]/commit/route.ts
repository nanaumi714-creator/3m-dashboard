import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type CommitPayload = {
  draftIds?: string[];
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
  drafts: ImportDraftMetadata[];
};

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

function buildFingerprint(
  occurredOn: string,
  amountYen: number,
  paymentMethodId: string,
  vendorNorm: string
) {
  return crypto
    .createHash("sha256")
    .update([occurredOn, amountYen, paymentMethodId, vendorNorm, "import_job_csv"].join("|"))
    .digest("hex");
}

function validateDraft(draft: ImportDraftMetadata): string[] {
  const issues: string[] = [];
  if (!draft.occurred_on) {
    issues.push("occurred_on is required");
  }
  if (!Number.isFinite(draft.amount_yen) || draft.amount_yen === 0) {
    issues.push("amount_yen is invalid");
  }
  if (!draft.description?.trim()) {
    issues.push("description is required");
  }
  if (!draft.payment_method_id) {
    issues.push("payment_method_id is required");
  }
  return issues;
}

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;
    const payload = (await request.json()) as CommitPayload;

    const { data: source, error: sourceError } = await supabase
      .from("import_sources")
      .select("id, metadata")
      .eq("id", jobId)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    }

    const metadata = parseMetadata(source.metadata);
    if (!metadata) {
      return NextResponse.json({ error: "Invalid import job metadata." }, { status: 400 });
    }

    const selectedIds = payload.draftIds ?? [];
    const targetDrafts = metadata.drafts.filter(
      (draft) => draft.status === 0 && (selectedIds.length === 0 || selectedIds.includes(draft.id))
    );

    if (targetDrafts.length === 0) {
      return NextResponse.json({ error: "No draft rows to commit." }, { status: 400 });
    }

    const invalidDrafts = targetDrafts
      .map((draft) => ({ id: draft.id, issues: validateDraft(draft) }))
      .filter((item) => item.issues.length > 0);

    if (invalidDrafts.length > 0) {
      return NextResponse.json(
        { error: "Some drafts are invalid.", invalidDrafts },
        { status: 400 }
      );
    }

    const normalizedRows = targetDrafts.map((draft) => {
      const normalizedAmount = (draft.amount_yen as number) < 0
        ? Math.round(draft.amount_yen as number)
        : -Math.abs(Math.round(draft.amount_yen as number));
      const vendorRaw = draft.vendor_raw?.trim() || draft.description?.trim() || "";
      const vendorNorm = draft.vendor_norm?.trim() || vendorRaw;

      return {
        draft,
        occurredOn: draft.occurred_on as string,
        amountYen: normalizedAmount,
        description: (draft.description as string).trim(),
        paymentMethodId: draft.payment_method_id as string,
        vendorRaw,
        vendorNorm,
      };
    });

    const fingerprints = normalizedRows.map((row) =>
      buildFingerprint(row.occurredOn, row.amountYen, row.paymentMethodId, row.vendorNorm)
    );

    const { data: duplicateCandidates, error: duplicateError } = await supabase
      .from("transactions")
      .select("id, fingerprint")
      .in("fingerprint", fingerprints);

    if (duplicateError) {
      throw duplicateError;
    }

    const duplicateFingerprints = new Set((duplicateCandidates ?? []).map((row) => row.fingerprint));
    const committedAt = new Date().toISOString();

    const insertedTransactions: { draftId: string; transactionId: string; fingerprint: string; duplicate: boolean }[] = [];

    for (const row of normalizedRows) {
      const fingerprint = buildFingerprint(
        row.occurredOn,
        row.amountYen,
        row.paymentMethodId,
        row.vendorNorm
      );

      const { data: inserted, error: insertError } = await supabase
        .from("transactions")
        .insert({
          occurred_on: row.occurredOn,
          amount_yen: row.amountYen,
          description: row.description,
          payment_method_id: row.paymentMethodId,
          import_source_id: jobId,
          source_row_number: row.draft.source_row_number,
          vendor_raw: row.vendorRaw,
          vendor_norm: row.vendorNorm,
          fingerprint,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        throw insertError || new Error("Failed to commit transaction.");
      }

      insertedTransactions.push({
        draftId: row.draft.id,
        transactionId: inserted.id,
        fingerprint,
        duplicate: duplicateFingerprints.has(fingerprint),
      });
    }

    const updatedDrafts = metadata.drafts.map((draft) => {
      const matched = insertedTransactions.find((item) => item.draftId === draft.id);
      if (!matched) {
        return draft;
      }

      return {
        ...draft,
        status: -1,
        committed_transaction_id: matched.transactionId,
        committed_at: committedAt,
      };
    });

    const { error: updateError } = await supabase
      .from("import_sources")
      .update({ metadata: { ...metadata, drafts: updatedDrafts } })
      .eq("id", jobId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      committedCount: insertedTransactions.length,
      duplicateCandidates: insertedTransactions.filter((row) => row.duplicate).map((row) => row.transactionId),
      transactions: insertedTransactions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Commit failed.";
    console.error("Import job commit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
