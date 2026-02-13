"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchVisibleExpenseCategories } from "@/lib/expense-categories";

type ReceiptRow = {
  id: string;
  storage_url: string;
  original_filename: string | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
};

type PaymentMethod = {
  id: string;
  name: string;
};

type ExpenseCategory = {
  id: string;
  name: string;
};

type VendorSuggestion = {
  vendorId: string | null;
  matchedVendorName: string | null;
  categoryId: string | null;
  businessRatio: number | null;
  isBusiness: boolean | null;
};

export default function ReceiptReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const receiptId = params?.id;

  const [receipt, setReceipt] = useState<ReceiptRow | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const initialOccurredOn = searchParams.get("occurredOn") || "";
  const initialAmount = searchParams.get("amountYen") || "";
  const initialVendor = searchParams.get("vendorName") || "";
  const suggestionSummary = useMemo(
    () => ({
      occurredOn: initialOccurredOn || "日付未入力",
      amountYen: initialAmount || "-",
      vendorName: initialVendor || "-",
    }),
    [initialAmount, initialOccurredOn, initialVendor]
  );

  const [occurredOn, setOccurredOn] = useState(initialOccurredOn);
  const [amountYen, setAmountYen] = useState(initialAmount);
  const [vendorName, setVendorName] = useState(initialVendor);
  const [description, setDescription] = useState(initialVendor);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [businessRatio, setBusinessRatio] = useState("100");
  const [isBusiness, setIsBusiness] = useState(true);
  const [matchedVendorName, setMatchedVendorName] = useState<string | null>(null);
  const isDateMissing = !occurredOn;
  const isSuggestedDateMissing = !initialOccurredOn;

  const ocrPreview = useMemo(() => {
    if (!receipt?.ocr_text) return "OCRテキストがまだありません。";
    return receipt.ocr_text;
  }, [receipt]);

  useEffect(() => {
    async function loadData() {
      if (!receiptId || typeof receiptId !== "string") return;
      setLoading(true);
      try {
        const { data: receiptData, error: receiptError } = await supabase
          .from("receipts")
          .select("id, storage_url, original_filename, ocr_text, ocr_confidence")
          .eq("id", receiptId)
          .single();

        if (receiptError) throw receiptError;
        setReceipt(receiptData as ReceiptRow);

        const [{ data: methods, error: methodsError }, cats] =
          await Promise.all([
            supabase
              .from("payment_methods")
              .select("id, name")
              .eq("is_active", true)
              .order("name"),
            fetchVisibleExpenseCategories(supabase),
          ]);

        if (methodsError) throw methodsError;

        setPaymentMethods((methods || []) as PaymentMethod[]);
        setCategories((cats || []) as ExpenseCategory[]);
      } catch (error) {
        console.error("Failed to load receipt", error);
        setStatusMessage(
          error instanceof Error ? error.message : "読み込みに失敗しました。"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [receiptId]);

  useEffect(() => {
    if (!vendorName.trim()) {
      setMatchedVendorName(null);
    }
  }, [vendorName]);

  useEffect(() => {
    if (!isBusiness) {
      setCategoryId("");
      setBusinessRatio("0");
    }
  }, [isBusiness]);

  async function handleVendorLookup() {
    if (!vendorName.trim()) {
      setStatusMessage("ベンダー名を入力してください。");
      return;
    }

    try {
      const response = await fetch("/api/vendors/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "ベンダー参照に失敗しました。");
      }

      const payload = (await response.json()) as { suggestion: VendorSuggestion };
      const suggestion = payload.suggestion;

      setMatchedVendorName(suggestion.matchedVendorName || null);
      if (suggestion.categoryId) {
        setCategoryId(suggestion.categoryId);
      }
      if (typeof suggestion.businessRatio === "number") {
        setBusinessRatio(String(suggestion.businessRatio));
      }
      if (typeof suggestion.isBusiness === "boolean") {
        setIsBusiness(suggestion.isBusiness);
      }

      setStatusMessage("ベンダー候補を反映しました。");
    } catch (error) {
      console.error("Vendor lookup failed", error);
      setStatusMessage(
        error instanceof Error ? error.message : "ベンダー参照に失敗しました。"
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (!receiptId || typeof receiptId !== "string") {
      setStatusMessage("レシートIDが見つかりません。");
      return;
    }

    if (!occurredOn) {
      setStatusMessage("取引日を入力してください。");
      return;
    }

    const amountValue = Number(amountYen);
    if (!amountYen || !Number.isFinite(amountValue) || amountValue === 0) {
      setStatusMessage("金額を入力してください。");
      return;
    }

    if (!vendorName.trim()) {
      setStatusMessage("ベンダー名を入力してください。");
      return;
    }

    if (!paymentMethodId) {
      setStatusMessage("支払い手段を選択してください。");
      return;
    }

    const ratioValue = Number(businessRatio);
    if (!Number.isFinite(ratioValue) || ratioValue < 0 || ratioValue > 100) {
      setStatusMessage("事業按分は0〜100で入力してください。");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/receipts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId,
          occurredOn,
          amountYen: amountValue,
          vendorName,
          description,
          paymentMethodId,
          categoryId: categoryId || null,
          businessRatio: ratioValue,
          isBusiness,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "保存に失敗しました。");
      }

      const payload = (await response.json()) as { transactionId: string };
      router.replace(`/receipts/complete/${payload.transactionId}`);
    } catch (error) {
      console.error("Save failed", error);
      setStatusMessage(
        error instanceof Error ? error.message : "保存に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">レシートが見つかりません。</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              OCR結果を確認
            </h1>
            <p className="text-gray-600">
              抽出内容を確認し、必要に応じて修正してください。
            </p>
          </div>
          <Link
            href="/receipts/upload"
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            もう一枚アップロード
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                取引情報
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      取引日
                      {isDateMissing && (
                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
                          日付未入力
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={occurredOn}
                      onChange={(event) => setOccurredOn(event.target.value)}
                      className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDateMissing ? "border-red-300 bg-red-50/50" : "border-gray-300"}`}
                    />
                    {isDateMissing && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        取引日が未入力です。保存前に必ず入力してください。
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      金額（JPY）
                    </label>
                    <input
                      type="number"
                      value={amountYen}
                      onChange={(event) => setAmountYen(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ベンダー名
                  </label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(event) => {
                        setVendorName(event.target.value);
                        if (!description) {
                          setDescription(event.target.value);
                        }
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: セブン-イレブン"
                    />
                    <button
                      type="button"
                      onClick={handleVendorLookup}
                      className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      ベンダー候補を反映
                    </button>
                  </div>
                  {matchedVendorName && (
                    <p className="text-sm text-gray-500 mt-2">
                      マッチしたベンダー: {matchedVendorName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    内容
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      支払い手段
                    </label>
                    <select
                      value={paymentMethodId}
                      onChange={(event) => setPaymentMethodId(event.target.value)}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      事業区分
                    </label>
                    <select
                      value={isBusiness ? "business" : "personal"}
                      onChange={(event) => setIsBusiness(event.target.value === "business")}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="business">事業経費</option>
                      <option value="personal">プライベート</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カテゴリ
                    </label>
                    <select
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!isBusiness}
                    >
                      <option value="">-- 未選択 --</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      事業按分（%）
                    </label>
                    <input
                      type="number"
                      value={businessRatio}
                      onChange={(event) => setBusinessRatio(event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!isBusiness}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
                  <p className="text-sm text-gray-600">
                    保存すると取引とレシートが紐付きます。
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "保存中..." : "保存して確定"}
                  </button>
                </div>

                {statusMessage && (
                  <p className="text-sm text-gray-700">{statusMessage}</p>
                )}
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                LLM抽出候補
              </h2>
              <dl className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <dt className="text-gray-500">取引日</dt>
                  <dd>
                    {isSuggestedDateMissing ? (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
                        日付未入力
                      </span>
                    ) : (
                      suggestionSummary.occurredOn
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">金額</dt>
                  <dd>{suggestionSummary.amountYen}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">ベンダー</dt>
                  <dd>{suggestionSummary.vendorName}</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 mt-3">
                候補はOCRからの自動抽出です。必要に応じて左側フォームで修正してください。
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                OCR結果
              </h2>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-500">
                  信頼度: {receipt.ocr_confidence?.toFixed(2) ?? "-"}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const newText = prompt("OCRテキストを修正", receipt.ocr_text || "");
                    if (newText !== null && newText !== receipt.ocr_text) {
                      const { error } = await supabase
                        .from("receipts")
                        .update({ ocr_text: newText })
                        .eq("id", receipt.id);
                      if (!error) {
                        setReceipt(prev => prev ? { ...prev, ocr_text: newText } : null);
                        alert("OCRテキストを更新しました");
                      } else {
                        alert("更新に失敗しました");
                      }
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  ［編集］
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {receipt.ocr_text || "（テキストなし）"}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                画像プレビュー
              </h2>
              <div className="text-sm text-gray-500 mb-3">
                {receipt.original_filename || "アップロード済み"}
              </div>
              <img
                src={receipt.storage_url}
                alt="Receipt"
                className="w-full rounded-lg border border-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
