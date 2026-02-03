"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeVendor, sha256, formatDate } from "@/lib/utils/shared";
import { cn } from "@/lib/utils";
import { CsvDropzone } from "./components/CsvDropzone";
import { ColumnMappingForm } from "./components/ColumnMappingForm";
import { CsvPreview } from "./components/CsvPreview";

const REQUIRED_HEADERS = {
  date: "利用日",
  amount: "利用金額",
  description: "利用店舗",
};

type PaymentMethod = {
  id: string;
  name: string;
};

type CsvRow = {
  [key: string]: string;
};

type ValidationResult = {
  rowNumber: number;
  issues: string[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i += 1;
      continue;
    }

    if (char === "\"") {
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

export default function CsvImportPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [dateColumn, setDateColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [descriptionColumn, setDescriptionColumn] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const { data, error } = await supabase
          .from("payment_methods")
          .select("id, name")
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        setPaymentMethods(data || []);
      } catch (err) {
        console.error("Failed to load payment methods", err);
      } finally {
        setLoading(false);
      }
    }

    loadPaymentMethods();
  }, []);

  const hasHeaders = headers.length > 0;
  const missingRequiredHeaders = useMemo(() => {
    return Object.values(REQUIRED_HEADERS).filter(
      (header) => hasHeaders && !headers.includes(header)
    );
  }, [hasHeaders, headers]);

  const validationSummary = useMemo(() => {
    return {
      totalRows: rows.length,
      errorCount: validationErrors.length,
      missingHeaders: missingRequiredHeaders,
    };
  }, [rows.length, validationErrors.length, missingRequiredHeaders]);

  useEffect(() => {
    if (!hasHeaders) return;
    setDateColumn(headers.includes(REQUIRED_HEADERS.date) ? REQUIRED_HEADERS.date : headers[0] ?? "");
    setAmountColumn(headers.includes(REQUIRED_HEADERS.amount) ? REQUIRED_HEADERS.amount : headers[0] ?? "");
    setDescriptionColumn(
      headers.includes(REQUIRED_HEADERS.description)
        ? REQUIRED_HEADERS.description
        : headers[0] ?? ""
    );
  }, [hasHeaders, headers]);

  useEffect(() => {
    if (!rows.length || !dateColumn || !amountColumn || !descriptionColumn) {
      setValidationErrors([]);
      return;
    }

    const errors: ValidationResult[] = [];
    rows.forEach((row, index) => {
      const issues: string[] = [];
      const rawDate = row[dateColumn];
      const formattedDate = formatDate(rawDate || "");
      if (!formattedDate) {
        issues.push("日付がYYYY/MM/DD形式ではありません");
      }

      const rawAmount = row[amountColumn];
      const parsedAmount = Number(rawAmount?.replace(/,/g, ""));
      if (!Number.isFinite(parsedAmount)) {
        issues.push("金額が数値ではありません");
      }

      const description = row[descriptionColumn]?.trim();
      if (!description) {
        issues.push("利用店舗/摘要が空です");
      }

      if (issues.length > 0) {
        errors.push({ rowNumber: index + 2, issues });
      }
    });
    setValidationErrors(errors);
  }, [rows, dateColumn, amountColumn, descriptionColumn]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setStatusMessage(null);

    if (!file) {
      setFileName("");
      setFileContent("");
      setHeaders([]);
      setRows([]);
      return;
    }

    const text = await file.text();
    const normalizedText = text.replace(/^\uFEFF/, "");
    const parsed = parseCsv(normalizedText);
    if (parsed.length === 0) {
      setStatusMessage("CSVにデータがありません。");
      return;
    }

    const headerRow = parsed[0].map((value) => value.trim());
    const dataRows = parsed.slice(1).map((row) => toRowMap(headerRow, row));

    setFileName(file.name);
    setFileContent(normalizedText);
    setHeaders(headerRow);
    setRows(dataRows);
  }

  async function handleImport() {
    setStatusMessage(null);

    if (!fileContent || !fileName) {
      setStatusMessage("CSVファイルを選択してください。");
      return;
    }

    if (!selectedPaymentMethod) {
      setStatusMessage("支払い手段を選択してください。");
      return;
    }

    if (!dateColumn || !amountColumn || !descriptionColumn) {
      setStatusMessage("列マッピングを設定してください。");
      return;
    }

    if (validationErrors.length > 0) {
      setStatusMessage("CSVのフォーマットエラーを解消してください。");
      return;
    }

    setImporting(true);
    try {
      const checksum = await sha256(fileContent);
      const { data: existingSource, error: sourceError } = await supabase
        .from("import_sources")
        .select("id")
        .eq("checksum", checksum)
        .eq("source_type", "csv")
        .maybeSingle();

      if (sourceError) throw sourceError;
      if (existingSource?.id) {
        setStatusMessage("このCSVは既に取り込み済みです。");
        return;
      }

      const { data: sourceInsert, error: insertSourceError } = await supabase
        .from("import_sources")
        .insert({
          source_type: "csv",
          file_path: fileName,
          checksum,
          metadata: {
            columns: {
              date: dateColumn,
              amount: amountColumn,
              description: descriptionColumn,
            },
            headers,
          },
        })
        .select("id")
        .single();

      if (insertSourceError) throw insertSourceError;
      const importSourceId = sourceInsert?.id;

      if (!importSourceId) {
        throw new Error("インポートソースの登録に失敗しました。");
      }

      const rowsToInsert = await Promise.all(
        rows.map(async (row, index) => {
          const occurredOn = formatDate(row[dateColumn] || "") as string;
          const rawAmount = Number(row[amountColumn]?.replace(/,/g, ""));
          const amountYen = rawAmount < 0 ? rawAmount : -Math.abs(rawAmount);
          const description = row[descriptionColumn]?.trim() || "";
          const vendorRaw = description;
          const vendorNorm = normalizeVendor(vendorRaw);
          const fingerprint = await sha256(
            [occurredOn, amountYen, selectedPaymentMethod, vendorNorm, "csv"].join("|")
          );

          return {
            occurred_on: occurredOn,
            amount_yen: amountYen,
            description,
            payment_method_id: selectedPaymentMethod,
            import_source_id: importSourceId,
            source_row_number: index + 1,
            vendor_raw: vendorRaw,
            vendor_norm: vendorNorm,
            fingerprint,
          };
        })
      );

      const chunkSize = 200;
      for (let start = 0; start < rowsToInsert.length; start += chunkSize) {
        const chunk = rowsToInsert.slice(start, start + chunkSize);
        const { error: insertError } = await supabase
          .from("transactions")
          .insert(chunk);
        if (insertError) throw insertError;
      }

      setStatusMessage(`取り込み完了: ${rowsToInsert.length}件`);
      setRows([]);
      setHeaders([]);
      setFileContent("");
      setFileName("");
      setValidationErrors([]);
    } catch (err) {
      console.error("Import error", err);
      setStatusMessage(
        err instanceof Error ? err.message : "取り込みに失敗しました。"
      );
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">CSVインポート</h1>
          <p className="text-gray-500 font-medium">
            CSVのフォーマットを確認しながら、安全に取り込みます。
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6 space-y-8">
          <CsvDropzone fileName={fileName} onFileChange={handleFileChange} />

          <ColumnMappingForm
            headers={headers}
            dateColumn={dateColumn}
            amountColumn={amountColumn}
            descriptionColumn={descriptionColumn}
            selectedPaymentMethod={selectedPaymentMethod}
            paymentMethods={paymentMethods}
            onDateColumnChange={setDateColumn}
            onAmountColumnChange={setAmountColumn}
            onDescriptionColumnChange={setDescriptionColumn}
            onPaymentMethodChange={setSelectedPaymentMethod}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6 font-medium">
          <h2 className="text-lg font-black text-gray-900 mb-4">プレビュー</h2>
          <CsvPreview
            headers={headers}
            rows={rows}
            validationErrors={validationErrors}
            validationSummary={validationSummary}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">インポートを実行</h2>
              <p className="text-sm text-gray-400 font-medium tracking-tight">
                重複チェック（チェックサム）を行い、安全に登録されます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="w-full md:w-auto bg-blue-600 text-white px-12 py-5 rounded-2xl hover:bg-blue-700 transition-all font-black text-lg shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-[0.98]"
            >
              {importing ? "取り込み中..." : "取り込みを開始する"}
            </button>
          </div>
          {statusMessage && (
            <div className={cn(
              "mt-8 p-5 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2 duration-200",
              statusMessage.includes('完了') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
            )}>
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
