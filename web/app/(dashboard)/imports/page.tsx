"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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

function normalizeVendor(raw: string): string {
  return raw
    .slice(0, 30)
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

function formatDate(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return null;
  }
  const [year, month, day] = trimmed.split("/");
  return `${year}-${month}-${day}`;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CSVインポート</h1>
          <p className="text-gray-600">
            CSVのフォーマットを確認しながら、安全に取り込みます。
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">CSVファイル</h2>
            <input
              type="file"
              accept="text/csv"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {fileName && (
              <p className="text-sm text-gray-500 mt-2">選択中: {fileName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日付列
              </label>
              <select
                value={dateColumn}
                onChange={(event) => setDateColumn(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                推奨: {REQUIRED_HEADERS.date}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                金額列
              </label>
              <select
                value={amountColumn}
                onChange={(event) => setAmountColumn(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                推奨: {REQUIRED_HEADERS.amount}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                摘要/利用店舗列
              </label>
              <select
                value={descriptionColumn}
                onChange={(event) => setDescriptionColumn(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                推奨: {REQUIRED_HEADERS.description}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支払い手段
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(event) => setSelectedPaymentMethod(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              取り込みした取引に一括で設定されます。
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">プレビュー</h2>
          {rows.length === 0 ? (
            <p className="text-gray-500 text-sm">CSVを選択するとプレビューが表示されます。</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>行数: {validationSummary.totalRows}件</span>
                <span>エラー: {validationSummary.errorCount}件</span>
                {validationSummary.missingHeaders.length > 0 && (
                  <span className="text-amber-600">
                    標準ヘッダ不足: {validationSummary.missingHeaders.join(", ")}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      {headers.map((header) => (
                        <th key={header} className="px-3 py-2 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-t">
                        {headers.map((header) => (
                          <td key={header} className="px-3 py-2 text-gray-700">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700 mb-2">
                    フォーマットエラー（先頭5件）
                  </p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationErrors.slice(0, 5).map((error) => (
                      <li key={error.rowNumber}>
                        {error.rowNumber}行目: {error.issues.join(" / ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">取り込み</h2>
              <p className="text-sm text-gray-600">
                金額はJPY、支出は自動でマイナスに変換されます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? "取り込み中..." : "取り込み開始"}
            </button>
          </div>
          {statusMessage && (
            <p className="mt-4 text-sm text-gray-700">{statusMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
