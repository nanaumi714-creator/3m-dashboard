"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  payment_methods: Database["public"]["Tables"]["payment_methods"]["Row"] | null;
};

type Receipt = Database["public"]["Tables"]["receipts"]["Row"];

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocringId, setOcringId] = useState<string | null>(null);
  const [runOcrOnUpload, setRunOcrOnUpload] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*, payment_methods(*)")
          .eq("id", params.id)
          .single();

        if (transactionError) throw transactionError;
        setTransaction(transactionData as Transaction);

        const { data: receiptData, error: receiptError } = await supabase
          .from("receipts")
          .select("*")
          .eq("transaction_id", params.id)
          .order("uploaded_at", { ascending: false });

        if (receiptError) throw receiptError;
        setReceipts(receiptData || []);
      } catch (err) {
        console.error("Failed to load transaction:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("receiptFile");

    if (!(file instanceof File) || !file.size) {
      alert("証憑ファイルを選択してください。");
      return;
    }

    setUploading(true);
    try {
      const payload = new FormData();
      payload.append("transactionId", params.id);
      payload.append("file", file);
      payload.append("runOcr", String(runOcrOnUpload));

      const response = await fetch("/api/receipts", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "アップロードに失敗しました。");
      }

      const { receipt } = await response.json();
      setReceipts((prev) => [receipt, ...prev]);
      event.currentTarget.reset();
    } catch (err) {
      console.error("Upload error:", err);
      alert(err instanceof Error ? err.message : "アップロードに失敗しました。");
    } finally {
      setUploading(false);
    }
  }

  async function rerunOcr(receiptId: string) {
    setOcringId(receiptId);
    try {
      const response = await fetch(`/api/receipts/${receiptId}/ocr`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "OCRに失敗しました。");
      }

      setReceipts((prev) =>
        prev.map((receipt) =>
          receipt.id === receiptId
            ? {
                ...receipt,
                ocr_text: body.text,
                ocr_confidence: body.confidence,
              }
            : receipt
        )
      );
    } catch (err) {
      console.error("OCR error:", err);
      alert(err instanceof Error ? err.message : "OCRに失敗しました。");
    } finally {
      setOcringId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">取引を読み込み中...</div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          {error || "取引が見つかりませんでした。"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">取引詳細</h1>
          <p className="text-gray-600">証憑とOCR結果を確認できます。</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <dt className="text-gray-500 mb-1">日付</dt>
              <dd className="font-medium">{transaction.occurred_on}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">金額</dt>
              <dd className="font-medium">
                ¥{transaction.amount_yen.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">支払い手段</dt>
              <dd className="font-medium">
                {transaction.payment_methods?.name || "不明"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">ベンダー</dt>
              <dd className="font-medium">
                {transaction.vendor_raw || "未設定"}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-gray-500 mb-1">内容</dt>
              <dd className="font-medium">{transaction.description}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">証憑アップロード</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <input
              type="file"
              name="receiptFile"
              accept="image/*,application/pdf"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={runOcrOnUpload}
                onChange={(event) => setRunOcrOnUpload(event.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              アップロード後にOCRを実行する
            </label>
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50"
            >
              {uploading ? "アップロード中..." : "証憑を追加"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">証憑一覧</h2>
          {receipts.length === 0 ? (
            <p className="text-gray-600">証憑は未登録です。</p>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <a
                        href={receipt.storage_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm break-all"
                      >
                        {receipt.original_filename || receipt.storage_url}
                      </a>
                      <p className="text-xs text-gray-500 mt-1">
                        {receipt.uploaded_at}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          receipt.ocr_text
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {receipt.ocr_text ? "OCR済み" : "OCR未実行"}
                      </span>
                      <button
                        onClick={() => rerunOcr(receipt.id)}
                        disabled={ocringId === receipt.id}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {ocringId === receipt.id ? "OCR中..." : "OCR再実行"}
                      </button>
                    </div>
                  </div>
                  {receipt.ocr_text && (
                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {receipt.ocr_text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link href="/transactions" className="text-blue-600 hover:underline">
            ← 取引一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
