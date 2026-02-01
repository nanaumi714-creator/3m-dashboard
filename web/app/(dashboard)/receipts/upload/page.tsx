"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type AnalyzeResponse = {
  ocr: {
    text: string | null;
    confidence: number | null;
  };
  extraction: {
    occurredOn: string | null;
    amountYen: number | null;
    vendorName: string | null;
    description: string | null;
    categoryHint: string | null;
    paymentMethodHint: string | null;
    source: "llm" | "fallback";
  };
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

// --- Components ---

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

export default function ReceiptUploadPage() {
  const router = useRouter();

  // -- State: Step Control
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -- State: Data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");

  // -- State: Form
  const [occurredOn, setOccurredOn] = useState("");
  const [amountYen, setAmountYen] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [businessRatio, setBusinessRatio] = useState("100");
  const [isBusiness, setIsBusiness] = useState<"business" | "personal" | "pending">("pending");


  // -- State: Suggestion / Meta
  const [matchedVendorName, setMatchedVendorName] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // -- Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // -- Effects: Load Options
  useEffect(() => {
    async function loadOptions() {
      const [{ data: methods }, { data: cats }] = await Promise.all([
        supabase.from("payment_methods").select("id, name").eq("is_active", true).order("name"),
        supabase.from("expense_categories").select("id, name").eq("is_active", true).order("name"),
      ]);
      setPaymentMethods((methods || []) as PaymentMethod[]);
      setCategories((cats || []) as ExpenseCategory[]);
    }
    loadOptions();
  }, []);

  // -- Effects: Auto-trigger file input on mount
  useEffect(() => {
    // Small delay to ensure the browser is ready for the click
    const timer = setTimeout(() => {
      fileInputRef.current?.click();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // -- Effects: Cleanup Preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // -- Handlers: Upload Step
  function handleSelectClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state for new file
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
    setIsAnalyzing(true);
    setStep("upload"); // Stay on upload visual until analyzed, or switch immediately? 
    // Let's show analyze loading state effectively

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/receipts/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("解析に失敗しました。");
      }

      const data = (await response.json()) as AnalyzeResponse;
      const ext = data.extraction;

      // Populate Form from LLM extraction
      setOcrText(data.ocr.text || "");
      if (ext.occurredOn) setOccurredOn(ext.occurredOn);
      if (ext.amountYen) setAmountYen(String(ext.amountYen));
      if (ext.vendorName) {
        setVendorName(ext.vendorName);
        // Trigger lookup if possible
        handleVendorLookup(ext.vendorName);
      }
      // Use LLM description or fallback to vendor name
      if (ext.description) {
        setDescription(ext.description);
      } else if (ext.vendorName) {
        setDescription(ext.vendorName);
      }

      // Auto-match category from hint (partial match)
      if (ext.categoryHint && categories.length > 0) {
        const hint = ext.categoryHint.toLowerCase();
        const matched = categories.find(c =>
          c.name.toLowerCase().includes(hint) || hint.includes(c.name.toLowerCase())
        );
        if (matched) setCategoryId(matched.id);
      }

      // Auto-match payment method from hint (partial match)
      if (ext.paymentMethodHint && paymentMethods.length > 0) {
        const hint = ext.paymentMethodHint.toLowerCase();
        const matched = paymentMethods.find(m =>
          m.name.toLowerCase().includes(hint) || hint.includes(m.name.toLowerCase())
        );
        if (matched) setPaymentMethodId(matched.id);
      }

      setStep("review");
    } catch (error) {
      console.error(error);
      setErrorMessage("画像の解析に失敗しました。もう一度お試しください。");
      setSelectedFile(null); // Reset to allow retry
    } finally {
      setIsAnalyzing(false);
      // Clear input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Reuse logic from review page
  async function handleVendorLookup(name: string) {
    if (!name.trim()) return;
    try {
      const response = await fetch("/api/vendors/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName: name }),
      });
      if (response.ok) {
        const payload = await response.json();
        const suggestion = payload.suggestion as VendorSuggestion;

        setMatchedVendorName(suggestion.matchedVendorName || null);
        if (suggestion.categoryId) setCategoryId(suggestion.categoryId);
        if (typeof suggestion.businessRatio === "number") setBusinessRatio(String(suggestion.businessRatio));
        if (typeof suggestion.isBusiness === "boolean") {
          setIsBusiness(suggestion.isBusiness ? "business" : "personal");
        }
      }
    } catch (e) { console.error(e); }
  }

  // -- Handlers: Review Step

  async function handleSave() {
    setErrorMessage(null);
    if (!selectedFile) return;

    // Validation
    const amountVal = Number(amountYen);
    if (!occurredOn || !amountYen || !Number.isFinite(amountVal) || !paymentMethodId || !vendorName.trim()) {
      setErrorMessage("必須項目（取引日、金額、ベンダー、支払い手段）を入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      const transactionData = {
        occurredOn,
        amountYen: amountVal,
        vendorName,
        description,
        paymentMethodId,
        categoryId: categoryId || null,
        businessRatio: Number(businessRatio),
        isBusiness: isBusiness === "pending" ? null : isBusiness === "business",
      };

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("ocrText", ocrText);
      formData.append("transactionData", JSON.stringify(transactionData));

      const response = await fetch("/api/receipts/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "保存に失敗しました。");
      }

      const payload = await response.json();
      router.push(`/receipts/complete/${payload.transactionId}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました。");
      setIsSaving(false);
    }
  }

  // -- Render Steps --

  if (step === "upload") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 max-w-xl w-full text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">レシートをアップロード</h1>
          <p className="text-gray-600">
            画像を解析し、内容を確認してからデータベースに保存します。<br />
            画像はプレビューのみで、保存するまでサーバーに残りません。
          </p>

          <div className="py-8">
            <button
              type="button"
              onClick={handleSelectClick}
              disabled={isAnalyzing}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <>
                  <Spinner />
                  <span>解析中...</span>
                </>
              ) : (
                "画像を選択 / カメラを起動"
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {errorMessage && (
            <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">{errorMessage}</div>
          )}
        </div>
      </div>
    );
  }

  // Step: Review
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">内容の確認と編集</h1>
          <button
            onClick={() => {
              if (confirm("保存せずに戻りますか？内容は破棄されます。")) {
                setStep("upload");
                setSelectedFile(null);
                setPreviewUrl(null);
              }
            }}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            キャンセルして戻る
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 sticky top-4 z-10 shadow-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 order-2 lg:order-1">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">取引詳細</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">取引日 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金額 (円) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={amountYen}
                  onChange={(e) => setAmountYen(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ベンダー名 <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => {
                    setVendorName(e.target.value);
                    if (!description) setDescription(e.target.value);
                  }}
                  onBlur={() => handleVendorLookup(vendorName)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="店名など"
                />
                <button
                  type="button"
                  onClick={() => handleVendorLookup(vendorName)}
                  className="bg-gray-100 text-gray-700 px-3 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
                >
                  候補検索
                </button>
              </div>
              {matchedVendorName && <p className="text-xs text-green-600 mt-1">✓ 登録済み: {matchedVendorName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支払い手段 <span className="text-red-500">*</span></label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">選択してください</option>
                  {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">未選択</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事業区分</label>
                <select
                  value={isBusiness}
                  onChange={(e) => setIsBusiness(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="business">事業経費</option>
                  <option value="personal">プライベート</option>
                  <option value="pending">未判定（後で選ぶ）</option>
                </select>
              </div>
              {isBusiness === "business" && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-1">事業按分 (%)</label>
                  <input
                    type="number"
                    min="0" max="100"
                    value={businessRatio}
                    onChange={(e) => setBusinessRatio(e.target.value)}
                    className="w-full border border-blue-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 sticky bottom-0 bg-white border-t border-gray-100 -mb-6 -mx-6 p-6 rounded-b-xl">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <Spinner />}
                {isSaving ? "保存中..." : "保存して完了"}
              </button>
            </div>
          </div>

          {/* Right Column: Preview & OCR */}
          <div className="space-y-6 order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700 flex justify-between items-center">
                <span>画像プレビュー</span>
                <span className="text-xs text-gray-500">※サーバーにはまだ保存されていません</span>
              </div>
              <div className="relative bg-gray-800 flex justify-center py-4">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[500px] w-auto object-contain"
                  />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">OCRテキスト (生データ)</h2>
              <p className="text-xs text-gray-500 mb-2">
                抽出の元になったテキストです。誤字がある場合はここで修正して保存できます。
              </p>
              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="w-full h-64 border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
