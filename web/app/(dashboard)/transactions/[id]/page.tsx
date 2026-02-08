"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { fetchVisibleExpenseCategories } from "@/lib/expense-categories";
import { normalizeVendor, sha256 } from "@/lib/utils/shared";

type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];
type PaymentMethod = Database["public"]["Tables"]["payment_methods"]["Row"];
type BusinessInfo = Database["public"]["Tables"]["transaction_business_info"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  category_id?: string | null;
  payment_methods?: PaymentMethod | null;
  transaction_business_info:
  | Database["public"]["Tables"]["transaction_business_info"]["Row"]
  | null;
};
type OcrUsageSummary = {
  used: number;
  limit: number;
  remaining: number;
  periodStart: string;
};


export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptLinks, setReceiptLinks] = useState<Record<string, string>>({});
  const [receiptLinkError, setReceiptLinkError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocringId, setOcringId] = useState<string | null>(null);
  const [runOcrOnUpload, setRunOcrOnUpload] = useState(true);
  const [ocrUsage, setOcrUsage] = useState<OcrUsageSummary | null>(null);
  const [ocrUsageError, setOcrUsageError] = useState<string | null>(null);
  const [editOccurredOn, setEditOccurredOn] = useState("");
  const [editAmountYen, setEditAmountYen] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVendorRaw, setEditVendorRaw] = useState("");
  const [editPaymentMethodId, setEditPaymentMethodId] = useState("");
  const [editIsBusiness, setEditIsBusiness] = useState(true);
  const [editBusinessRatio, setEditBusinessRatio] = useState("100");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAuditNote, setEditAuditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const isOcrLimitReached = ocrUsage ? ocrUsage.used >= ocrUsage.limit : false;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", params.id)
          .single();

        if (transactionError) throw transactionError;
        const transactionRow = transactionData as Transaction;
        const { data: businessInfoData, error: businessInfoError } =
          await supabase
            .from("transaction_business_info")
            .select("*")
            .eq("transaction_id", params.id)
            .maybeSingle();
        if (businessInfoError) throw businessInfoError;
        let paymentMethod: PaymentMethod | null = null;
        if (transactionRow.payment_method_id) {
          const { data: paymentMethodData, error: paymentMethodError } =
            await supabase
              .from("payment_methods")
              .select("*")
              .eq("id", transactionRow.payment_method_id)
              .maybeSingle();
          if (paymentMethodError) throw paymentMethodError;
          paymentMethod = paymentMethodData;
        }

        setTransaction({
          ...transactionRow,
          payment_methods: paymentMethod,
          transaction_business_info: businessInfoData ?? null,
        });

        const { data: receiptData, error: receiptError } = await supabase
          .from("receipts")
          .select("*")
          .eq("transaction_id", params.id)
          .order("uploaded_at", { ascending: false });

        if (receiptError) throw receiptError;
        setReceipts((receiptData || []) as Receipt[]);

        const [categoryData, { data: paymentData, error: paymentError }] =
          await Promise.all([
            fetchVisibleExpenseCategories(supabase),
            supabase
              .from("payment_methods")
              .select("*")
              .eq("is_active", true)
              .order("name"),
          ]);

        if (paymentError) throw paymentError;
        const visibleCategories = (categoryData || []) as ExpenseCategory[];
        let mergedCategories = visibleCategories;

        if (transactionRow.category_id) {
          const isMissing = !visibleCategories.some(
            (category) => category.id === transactionRow.category_id
          );
          if (isMissing) {
            const { data: currentCategory, error: currentCategoryError } =
              await supabase
                .from("expense_categories")
                .select("*")
                .eq("id", transactionRow.category_id)
                .maybeSingle();
            if (currentCategoryError) throw currentCategoryError;
            if (currentCategory) {
              mergedCategories = [currentCategory, ...visibleCategories];
            }
          }
        }

        setCategories(mergedCategories);
        setPaymentMethods((paymentData || []) as PaymentMethod[]);
      } catch (err) {
        console.error("Failed to load transaction:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  useEffect(() => {
    if (!transaction) return;
    setEditOccurredOn(transaction.occurred_on);
    setEditAmountYen(transaction.amount_yen.toString());
    setEditDescription(transaction.description);
    setEditVendorRaw(transaction.vendor_raw || "");
    setEditPaymentMethodId(transaction.payment_method_id ?? "");

    const businessInfo = transaction.transaction_business_info;
    setEditIsBusiness(businessInfo?.is_business ?? true);
    setEditBusinessRatio((businessInfo?.business_ratio ?? 100).toString());
    setEditCategoryId(transaction.category_id ?? "");
    setEditAuditNote(businessInfo?.audit_note ?? "");
  }, [transaction]);

  async function refreshOcrUsage() {
    try {
      setOcrUsageError(null);
      const response = await fetch("/api/ocr/usage");
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "OCR利用状況の取得に失敗しました。");
      }

      setOcrUsage(body as OcrUsageSummary);
    } catch (err) {
      console.error("Failed to load OCR usage:", err);
      setOcrUsageError(
        err instanceof Error ? err.message : "OCR利用状況の取得に失敗しました。"
      );
    }
  }

  useEffect(() => {
    void refreshOcrUsage();
  }, []);

  useEffect(() => {
    if (isOcrLimitReached) {
      setRunOcrOnUpload(false);
    }
  }, [isOcrLimitReached]);

  useEffect(() => {
    async function updateReceiptLinks() {
      if (receipts.length === 0) {
        setReceiptLinks({});
        setReceiptLinkError(null);
        return;
      }

      setReceiptLinkError(null);

      try {
        const response = await fetch(`/api/transactions/${params.id}/receipts-urls`);
        if (!response.ok) {
          throw new Error("署名付きURLの一括取得に失敗しました。");
        }
        const body = (await response.json()) as { urls: Record<string, string> };
        setReceiptLinks(body.urls);

        if (Object.keys(body.urls).length === 0) {
          setReceiptLinkError("表示可能な証憑が見つかりません。");
        }
      } catch (err) {
        console.error("Batch URL generation failed:", err);
        setReceiptLinkError("証憑の表示リンク生成に失敗しました。");
      }
    }

    void updateReceiptLinks();
  }, [receipts, params.id]);

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
        if (response.status === 429) {
          await refreshOcrUsage();
        }
        throw new Error(body.error || "アップロードに失敗しました。");
      }

      const { receipt } = await response.json();
      setReceipts((prev) => [receipt, ...prev]);
      if (runOcrOnUpload) {
        await refreshOcrUsage();
      }
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
        if (response.status === 429) {
          await refreshOcrUsage();
        }
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
      await refreshOcrUsage();
    } catch (err) {
      console.error("OCR error:", err);
      alert(err instanceof Error ? err.message : "OCRに失敗しました。");
    } finally {
      setOcringId(null);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);

    if (!editOccurredOn) {
      setSaveMessage("取引日を入力してください。");
      return;
    }

    const rawAmount = Number(editAmountYen);
    if (!Number.isFinite(rawAmount) || rawAmount === 0) {
      setSaveMessage("金額を正しく入力してください。");
      return;
    }

    if (!editPaymentMethodId) {
      setSaveMessage("支払い手段を選択してください。");
      return;
    }

    if (!editDescription.trim()) {
      setSaveMessage("内容を入力してください。");
      return;
    }

    const ratio = Number(editBusinessRatio);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 100) {
      setSaveMessage("事業比率は0〜100の範囲で入力してください。");
      return;
    }

    setSaving(true);
    try {
      const normalizedAmount = rawAmount < 0 ? rawAmount : -Math.abs(rawAmount);
      const vendorValue = editVendorRaw.trim() || editDescription.trim();
      const vendorNorm = normalizeVendor(vendorValue);
      const sourceType = transaction?.import_source_id ? "csv" : "manual";
      const fingerprint = await sha256(
        [editOccurredOn, normalizedAmount, editPaymentMethodId, vendorNorm, sourceType].join("|")
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any).from("transactions")
        .update({
          occurred_on: editOccurredOn,
          amount_yen: normalizedAmount,
          description: editDescription.trim(),
          payment_method_id: editPaymentMethodId,
          vendor_raw: vendorValue,
          vendor_norm: vendorNorm,
          category_id: editCategoryId || null,
          fingerprint,
        })
        .eq("id", params.id);

      if (updateError) throw updateError;

      const judgedAt = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from("transaction_business_info")
        .upsert({
          transaction_id: params.id,
          is_business: editIsBusiness,
          business_ratio: ratio,
          audit_note: editAuditNote.trim() || null,
          judged_by: "gui",
          judged_at: judgedAt,
        });

      if (upsertError) throw upsertError;

      setTransaction((prev) => {
        if (!prev) return prev;
        const nextBusinessInfo: BusinessInfo = {
          ...(prev.transaction_business_info ?? {
            transaction_id: params.id,
            created_at: judgedAt,
            user_id: null,
          }),
          is_business: editIsBusiness,
          business_ratio: ratio,
          category_id: editCategoryId || null,
          audit_note: editAuditNote.trim() || null,
          judged_by: "gui",
          judged_at: judgedAt,
        };
        return {
          ...prev,
          occurred_on: editOccurredOn,
          amount_yen: normalizedAmount,
          description: editDescription.trim(),
          payment_method_id: editPaymentMethodId,
          vendor_raw: vendorValue,
          vendor_norm: vendorNorm,
          category_id: editCategoryId || null,
          fingerprint,
          transaction_business_info: nextBusinessInfo,
        };
      });
      setSaveMessage("保存しました。");
    } catch (err) {
      console.error("Save error:", err);
      setSaveMessage(
        err instanceof Error ? err.message : "保存に失敗しました。"
      );
    } finally {
      setSaving(false);
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">編集</h2>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  取引日
                </label>
                <input
                  type="date"
                  value={editOccurredOn}
                  onChange={(event) => setEditOccurredOn(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金額（JPY, 支出はマイナス）
                </label>
                <input
                  type="number"
                  value={editAmountYen}
                  onChange={(event) => setEditAmountYen(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ベンダー
                </label>
                <input
                  type="text"
                  value={editVendorRaw}
                  onChange={(event) => setEditVendorRaw(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支払い手段
                </label>
                <select
                  value={editPaymentMethodId}
                  onChange={(event) => setEditPaymentMethodId(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">選択してください</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事業判定
                </label>
                <button
                  type="button"
                  onClick={() => setEditIsBusiness((prev) => !prev)}
                  className={`w-full px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${editIsBusiness
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-purple-100 text-purple-800 border-purple-200"
                    }`}
                >
                  {editIsBusiness ? "事業用" : "プライベート"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事業比率（0-100）
                </label>
                <input
                  type="number"
                  value={editBusinessRatio}
                  onChange={(event) => setEditBusinessRatio(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリー
                </label>
                <select
                  value={editCategoryId}
                  onChange={(event) => setEditCategoryId(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">未設定</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  監査メモ
                </label>
                <input
                  type="text"
                  value={editAuditNote}
                  onChange={(event) => setEditAuditNote(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-sm text-gray-600">
                判定の更新は監査ログとして保存されます。
              </p>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>

            {saveMessage && (
              <p className="text-sm text-gray-700">{saveMessage}</p>
            )}
          </form>
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
                disabled={isOcrLimitReached}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              アップロード後にOCRを実行する
            </label>
            {ocrUsage ? (
              <p className="text-xs text-gray-500">
                今月のOCR利用: {ocrUsage.used}/{ocrUsage.limit}ページ
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                {ocrUsageError || "OCR利用状況を確認中..."}
              </p>
            )}
            {isOcrLimitReached && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">今月のOCR利用上限に達しました。</p>
                <p className="mt-1">
                  OCRボタンは無効です。手入力フォームで内容を登録してください。
                </p>
                <Link href="/transactions/new" className="mt-2 inline-flex text-blue-700 underline">
                  手入力フォームへ
                </Link>
              </div>
            )}
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
                      {receiptLinks[receipt.id] ? (
                        <a
                          href={receiptLinks[receipt.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {receipt.original_filename || receipt.storage_url}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 break-all">
                          {receipt.original_filename || receipt.storage_url}
                        </span>
                      )}
                      {!receiptLinks[receipt.id] && (
                        <p className="text-xs text-red-500 mt-1">
                          {receiptLinkError ||
                            "署名付きURLの生成に失敗しました。"}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {receipt.uploaded_at}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${receipt.ocr_text
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {receipt.ocr_text ? "OCR済み" : "OCR未実行"}
                      </span>
                      <button
                        onClick={() => rerunOcr(receipt.id)}
                        disabled={ocringId === receipt.id || isOcrLimitReached}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {ocringId === receipt.id
                          ? "OCR中..."
                          : isOcrLimitReached
                            ? "OCR上限超過"
                            : "OCR再実行"}
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
