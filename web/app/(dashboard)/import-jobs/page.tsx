"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeVendor, sha256, formatDate } from "@/lib/utils/shared";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PaymentMethod = {
  id: string;
  name: string;
};

type DraftRow = {
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

type ImportMetadata = {
  drafts: DraftRow[];
};

type CsvRow = Record<string, string>;

const REQUIRED_HEADERS = {
  date: "利用日",
  amount: "利用金額",
  description: "利用店舗",
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function toRowMap(headers: string[], values: string[]): CsvRow {
  return headers.reduce<CsvRow>((acc, header, index) => {
    acc[header] = values[index] ?? "";
    return acc;
  }, {});
}

export default function ImportJobsPage() {
  const [fileName, setFileName] = useState("");
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadPaymentMethods() {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("Failed to load payment methods", error);
        return;
      }
      setPaymentMethods(data || []);
    }

    loadPaymentMethods();
  }, []);

  const pendingDrafts = useMemo(
    () => draftRows.filter((row) => row.status === 0),
    [draftRows]
  );

  const committedDrafts = useMemo(
    () => draftRows.filter((row) => row.status === -1),
    [draftRows]
  );

  async function processSelectedFile(file: File) {
    setMessage(null);

    const text = (await file.text()).replace(/^\uFEFF/, "");
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setMessage("CSVデータが不足しています。");
      return;
    }

    const headers = parsed[0].map((h) => h.trim());
    const missingHeaders = Object.values(REQUIRED_HEADERS).filter(
      (header) => !headers.includes(header)
    );
    if (missingHeaders.length > 0) {
      setMessage(`必須列が不足しています: ${missingHeaders.join(", ")}`);
      return;
    }

    const rows = parsed.slice(1).map((line) => toRowMap(headers, line));

    const drafts: DraftRow[] = rows.map((row, index) => {
      const date = formatDate(row[REQUIRED_HEADERS.date] || "");
      const amountRaw = Number((row[REQUIRED_HEADERS.amount] || "").replace(/,/g, ""));
      const amount = Number.isFinite(amountRaw)
        ? amountRaw < 0
          ? amountRaw
          : -Math.abs(amountRaw)
        : null;
      const description = row[REQUIRED_HEADERS.description]?.trim() || null;
      const vendorRaw = description;

      return {
        id: `${index + 1}`,
        status: 0,
        source_row_number: index + 1,
        occurred_on: date,
        amount_yen: amount,
        description,
        vendor_raw: vendorRaw,
        vendor_norm: vendorRaw ? normalizeVendor(vendorRaw) : null,
        payment_method_id: defaultPaymentMethodId || null,
        committed_transaction_id: null,
        committed_at: null,
      };
    });

    setFileName(file.name);
    setDraftRows(drafts);
    setJobId(null);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await processSelectedFile(file);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await processSelectedFile(file);
  }

  async function handleCreateDraft() {
    if (draftRows.length === 0 || !fileName) {
      setMessage("ファイルを選んでください。");
      return;
    }

    setSavingDraft(true);
    setMessage(null);

    try {
      const checksum = await sha256(JSON.stringify(draftRows));
      const payload = {
        fileName,
        checksum,
        aiExecuted: false,
        drafts: draftRows.map((row) => ({
          sourceRowNumber: row.source_row_number,
          occurredOn: row.occurred_on,
          amountYen: row.amount_yen,
          description: row.description,
          vendorRaw: row.vendor_raw,
          vendorNorm: row.vendor_norm,
          paymentMethodId: row.payment_method_id,
        })),
      };

      const response = await fetch("/api/import-jobs/csv-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as {
        error?: string;
        jobId?: string;
        metadata?: ImportMetadata | null;
        reused?: boolean;
      };

      if (!response.ok) {
        throw new Error(json.error || "仮の明細作成に失敗しました。");
      }

      setJobId(json.jobId || null);
      setDraftRows(json.metadata?.drafts || []);
      setMessage(
        json.reused
          ? "同じ内容のファイルを再利用しました。"
          : "仮の明細を作成しました。"
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "仮の明細作成に失敗しました。"
      );
    } finally {
      setSavingDraft(false);
    }
  }

  function updateDraft(index: number, patch: Partial<DraftRow>) {
    setDraftRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...patch,
      };
      return next;
    });
  }

  async function handleCommit() {
    if (!jobId) {
      setMessage("先に仮の明細を作成してください。");
      return;
    }

    setCommitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/import-jobs/${jobId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = (await response.json()) as {
        error?: string;
        committedCount?: number;
      };

      if (!response.ok) {
        throw new Error(json.error || "確定に失敗しました。");
      }

      setDraftRows((prev) =>
        prev.map((row) =>
          row.status === 0
            ? { ...row, status: -1, committed_at: new Date().toISOString() }
            : row
        )
      );
      setMessage(`この月の明細を確定しました（${json.committedCount || 0}件）。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "確定に失敗しました。");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 p-8 shadow-sm space-y-3">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">明細の整理</h1>
          <p className="text-gray-600 font-medium">
            一度、仮に置いてから整えます。
          </p>
          <p className="text-gray-500 font-medium text-sm">
            今月のファイルを読み込み、仮の明細を作成します。確定はまだ行いません。
          </p>
        </section>

        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">ファイルを追加</h2>
            <p className="text-sm text-gray-500 font-medium">画像 / PDF / CSV（現在はCSVに対応）</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">ファイルを選ぶ</label>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "rounded-2xl border border-dashed p-6 transition-all cursor-pointer",
                  isDragActive
                    ? "border-blue-400 bg-blue-50/60"
                    : "border-gray-300 bg-gray-50/60 hover:border-blue-300 hover:bg-blue-50/40"
                )}
              >
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-gray-700">ドラッグ＆ドロップ、またはクリックして選択</p>
                  <p className="text-xs text-gray-500 font-medium">.csv 形式のファイルに対応しています</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {fileName && (
                <p className="mt-3 text-xs text-gray-500 font-medium">選択中: {fileName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                初期設定する口座（任意・後から変更可能）
              </label>
              <select
                value={defaultPaymentMethodId}
                onChange={(event) => setDefaultPaymentMethodId(event.target.value)}
                className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="">未設定</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleCreateDraft}
              disabled={savingDraft || draftRows.length === 0}
              className="bg-white text-gray-700 border border-gray-200 px-6 py-3.5 rounded-2xl hover:bg-gray-50 transition-all font-bold disabled:opacity-50"
            >
              {savingDraft ? "作成中..." : "仮の明細を作成"}
            </button>
            <button
              onClick={handleCommit}
              disabled={committing || !jobId || pendingDrafts.length === 0}
              className="bg-slate-700 text-white px-8 py-3.5 rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-md shadow-slate-200 disabled:opacity-50"
            >
              {committing ? "確定中..." : "この月を確定する"}
            </button>
          </div>

          {message && (
            <div
              className={cn(
                "rounded-2xl p-4 text-sm font-bold",
                message.includes("失敗") || message.includes("不足")
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-slate-50 text-slate-700 border border-slate-100"
              )}
            >
              {message}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">仮の明細</h2>
            <p className="text-sm text-gray-600 font-medium">
              未確定 {pendingDrafts.length}件 / 確定済み {committedDrafts.length}件
            </p>
          </div>

          {draftRows.length === 0 ? (
            <p className="text-gray-500 font-medium">ファイルを追加すると、ここで整理できます。</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full text-sm bg-white">
                <thead className="bg-gray-50/70">
                  <tr className="text-gray-500">
                    <th className="text-left py-3 px-3">行</th>
                    <th className="text-left py-3 px-3">日付</th>
                    <th className="text-left py-3 px-3">金額</th>
                    <th className="text-left py-3 px-3">摘要</th>
                    <th className="text-left py-3 px-3">口座</th>
                    <th className="text-left py-3 px-3">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map((row, index) => (
                    <tr key={`${row.id}-${row.source_row_number}`} className="border-t border-gray-100">
                      <td className="py-2 px-3 font-bold text-gray-700">{row.source_row_number}</td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={row.occurred_on ?? ""}
                          onChange={(event) =>
                            updateDraft(index, { occurred_on: event.target.value || null })
                          }
                          disabled={row.status === -1}
                          className="w-full border-none bg-gray-50 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium disabled:opacity-60"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={row.amount_yen ?? ""}
                          onChange={(event) =>
                            updateDraft(index, {
                              amount_yen: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                          disabled={row.status === -1}
                          className="w-full border-none bg-gray-50 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium disabled:opacity-60"
                        />
                      </td>
                      <td className="py-2 px-3 min-w-[280px]">
                        <input
                          type="text"
                          value={row.description ?? ""}
                          onChange={(event) => {
                            const description = event.target.value;
                            updateDraft(index, {
                              description,
                              vendor_raw: description || null,
                              vendor_norm: description ? normalizeVendor(description) : null,
                            });
                          }}
                          disabled={row.status === -1}
                          className="w-full border-none bg-gray-50 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium disabled:opacity-60"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.payment_method_id ?? ""}
                          onChange={(event) =>
                            updateDraft(index, { payment_method_id: event.target.value || null })
                          }
                          disabled={row.status === -1}
                          className="w-full border-none bg-gray-50 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium disabled:opacity-60"
                        >
                          <option value="">未設定</option>
                          {paymentMethods.map((method) => (
                            <option key={method.id} value={method.id}>
                              {method.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            row.status === -1
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {row.status === -1 ? "確定済み" : "未確定"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
