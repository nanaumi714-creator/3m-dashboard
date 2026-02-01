"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Auto-trigger file input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fileInputRef.current?.click();
    }, 500);
    return () => clearTimeout(timer);
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
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-4">CSVファイルを選択</h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <svg className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-4 text-sm font-bold text-gray-600">クリックしてファイルを選択</p>
              <p className="text-xs text-gray-400 mt-1">.csv 形式のファイルに対応しています</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileName && (
              <div className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold w-fit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                選択中: {fileName}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 ml-1">日付列</label>
              <select
                value={dateColumn}
                onChange={(event) => setDateColumn(event.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
              >
                <option value="">選択してください</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 uppercase tracking-wider">推奨: {REQUIRED_HEADERS.date}</p>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 ml-1">金額列</label>
              <select
                value={amountColumn}
                onChange={(event) => setAmountColumn(event.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
              >
                <option value="">選択してください</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 uppercase tracking-wider">推奨: {REQUIRED_HEADERS.amount}</p>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 ml-1">摘要/店舗列</label>
              <select
                value={descriptionColumn}
                onChange={(event) => setDescriptionColumn(event.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
              >
                <option value="">選択してください</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 uppercase tracking-wider">推奨: {REQUIRED_HEADERS.description}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 ml-1">一括設定する支払い手段</label>
            <select
              value={selectedPaymentMethod}
              onChange={(event) => setSelectedPaymentMethod(event.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
            >
              <option value="">選択してください</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-black text-gray-900 mb-4">プレビュー</h2>
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-400 font-medium">CSVを選ぶとここにデータが表示されます</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Total: {validationSummary.totalRows}</span>
                <span className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", validationSummary.errorCount > 0 ? "bg-red-500" : "bg-green-500")}></div>Errors: {validationSummary.errorCount}</span>
              </div>
              <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner bg-gray-50/30">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/50 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                    <tr>
                      {headers.map((header) => (
                        <th key={header} className="px-5 py-4 text-left border-b border-gray-100">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 5).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        {headers.map((header) => (
                          <td key={header} className="px-5 py-4 text-gray-600 font-medium">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                  <p className="text-sm font-black text-red-700 mb-3">
                    フォーマットエラーが見つかりました（先頭5件）
                  </p>
                  <ul className="text-sm text-red-600 space-y-2 font-medium">
                    {validationErrors.slice(0, 5).map((error) => (
                      <li key={error.rowNumber} className="flex items-center gap-2">
                        <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-black">{error.rowNumber}行目</span>
                        {error.issues.join(" / ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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
