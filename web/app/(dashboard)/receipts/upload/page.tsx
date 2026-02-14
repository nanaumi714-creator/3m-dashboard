"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { fetchVisibleExpenseCategories } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";

type AnalyzeResponse = {
  ocr: { text: string | null; confidence: number | null; };
  extraction: {
    occurredOn: string | null;
    amountYen: number | null;
    vendorName: string | null;
    description: string | null;
    categoryHint: string | null;
    paymentMethodHint: string | null;
    memo: string | null;
    source: "llm" | "fallback";
  };
  hints: {
    matchedCategoryId: string | null;
    matchedPaymentMethodId: string | null;
  };
};

type PaymentMethod = { id: string; name: string; };
type ExpenseCategory = { id: string; name: string; };

export default function ReceiptUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");

  const [occurredOn, setOccurredOn] = useState("");
  const [amountYen, setAmountYen] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [businessRatio, setBusinessRatio] = useState("100");
  const [isBusiness, setIsBusiness] = useState<"business" | "personal" | "pending">("pending");
  const [allowReceiptStorage, setAllowReceiptStorage] = useState(false);
  const [showOcrText, setShowOcrText] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDateMissing = !occurredOn;

  useEffect(() => {
    async function loadOptions() {
      const [{ data: methods }, cats] = await Promise.all([
        supabase.from("payment_methods").select("id, name").eq("is_active", true).order("name"),
        fetchVisibleExpenseCategories(supabase),
      ]);
      setPaymentMethods((methods || []) as PaymentMethod[]);
      setCategories((cats || []) as ExpenseCategory[]);
    }
    loadOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (step === 'upload') fileInputRef.current?.click(); }, 500);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (isBusiness !== "business") {
      setAllowReceiptStorage(false);
    }
  }, [isBusiness]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("runAi", "false");
      const response = await fetch("/api/receipts/analyze", { method: "POST", body: formData });
      if (!response.ok) throw new Error("解析に失敗しました。");
      const data = (await response.json()) as AnalyzeResponse;
      setOcrText(data.ocr.text || "");
      setStep("review");
    } catch {
      setErrorMessage("画像の解析に失敗しました。もう一度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
  }


  async function handleAiAnalyze() {
    if (!selectedFile && !ocrText.trim()) {
      setErrorMessage("先にOCRを実行してください。");
      return;
    }

    setIsAiAnalyzing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      formData.append("ocrText", ocrText);
      formData.append("runAi", "true");

      const response = await fetch("/api/receipts/analyze", { method: "POST", body: formData });
      if (!response.ok) throw new Error("AI解析に失敗しました。");

      const data = (await response.json()) as AnalyzeResponse;
      const ext = data.extraction;

      if (ext.occurredOn) setOccurredOn(ext.occurredOn);
      if (ext.amountYen) setAmountYen(String(ext.amountYen));
      if (ext.vendorName) setVendorName(ext.vendorName);
      if (ext.description || ext.vendorName) setDescription(ext.description || ext.vendorName || "");

      if (data.hints.matchedCategoryId) {
        setCategoryId(data.hints.matchedCategoryId);
      }

      if (data.hints.matchedPaymentMethodId) {
        setPaymentMethodId(data.hints.matchedPaymentMethodId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI解析に失敗しました。";
      setErrorMessage(message);
    } finally {
      setIsAiAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!selectedFile || !occurredOn || !amountYen || !paymentMethodId || !vendorName.trim()) {
      setErrorMessage(isDateMissing ? "取引日を入力してください。" : "必須項目を入力してください。");
      return;
    }
    setIsSaving(true);
    try {
      const transactionData = { occurredOn, amountYen: Number(amountYen), vendorName, description, paymentMethodId, categoryId: categoryId || null, businessRatio: Number(businessRatio), isBusiness: isBusiness === "pending" ? null : isBusiness === "business" };
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("ocrText", ocrText);
      formData.append("storeReceipt", String(allowReceiptStorage));
      formData.append("transactionData", JSON.stringify(transactionData));
      const response = await fetch("/api/receipts/process", { method: "POST", body: formData });
      if (!response.ok) throw new Error("保存に失敗しました。");
      const payload = await response.json();
      router.push(`/receipts/complete/${payload.transactionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存に失敗しました。";
      setErrorMessage(message);
      setIsSaving(false);
    }
  }

  if (step === "upload") {
    // Non-scrolling initial screen for mobile
    return (
      <div className="flex flex-col items-center justify-center p-6 h-[70dvh] md:h-auto overflow-hidden">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-50">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">レシートを登録</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-12">Quick Upload</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="w-full bg-gray-900 text-white p-6 rounded-[32px] font-black text-sm active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4"
          >
            {isAnalyzing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
            {isAnalyzing ? "OCR実行中..." : "画像を選択してOCR実行"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
          {errorMessage && <p className="mt-6 text-[10px] font-black text-red-500 uppercase">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-1 md:px-4 overflow-x-hidden">
      <div className="mb-8 px-2 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">OCR結果の確認</h1>
          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Completed</span>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs font-bold text-gray-600">OCR結果を確認後、必要な場合のみAI解析を実行できます。</p>
          <button
            type="button"
            onClick={handleAiAnalyze}
            disabled={isAiAnalyzing}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-60"
          >
            {isAiAnalyzing ? "AI解析中..." : "AI解析を実行"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-6">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block border-b border-gray-50 pb-4">Transaction Details</span>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 mb-2">
                  取引日
                  {isDateMissing && (
                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase">
                      日付未入力
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  className={cn(
                    "w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-900",
                    isDateMissing && "ring-2 ring-red-200"
                  )}
                />
                {isDateMissing && (
                  <p className="mt-2 text-[10px] font-bold text-red-600">
                    取引日が未入力です。保存前に必ず入力してください。
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">金額 (JPY)</label>
                <input type="number" value={amountYen} onChange={(e) => setAmountYen(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-black text-gray-900 text-xl" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">支払先</label>
                <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-900" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">内容・概要</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold text-xs appearance-none">
                  <option value="">支払手段を選択</option>
                  {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold text-xs appearance-none">
                  <option value="">カテゴリ</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <p className="text-[10px] font-bold text-blue-500 ml-1">
                AIの提案値は候補です。最終決定は必ずご自身で確認してください。
              </p>
            </div>
          </div>

          <div className="p-8 bg-blue-50 rounded-[40px] space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Business Classification</span>
              {isBusiness === "business" && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={businessRatio}
                    onChange={(e) => setBusinessRatio(e.target.value)}
                    className="w-10 bg-white border-none rounded-lg py-1 text-xs font-black text-blue-600 text-center focus:ring-1 focus:ring-blue-200 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-black text-blue-400">%</span>
                </div>
              )}
            </div>
            <select value={isBusiness} onChange={(event) => setIsBusiness(event.target.value as "business" | "personal" | "pending")} className="w-full bg-white border-none rounded-2xl px-5 py-4 font-black text-blue-900 text-xs appearance-none mb-4">
              <option value="business">事業経費</option>
              <option value="personal">通常支出</option>
              <option value="pending">後で判定</option>
            </select>
            {isBusiness === "business" && (
              <div className="px-1">
                <input type="range" min="0" max="100" step="5" value={businessRatio} onChange={(e) => setBusinessRatio(e.target.value)} className="w-full h-1.5 bg-blue-100 rounded-lg appearance-none accent-blue-600" />
                <div className="flex justify-between mt-2 px-0.5">
                  <span className="text-[8px] font-bold text-blue-300 uppercase">Personal</span>
                  <span className="text-[8px] font-bold text-blue-300 uppercase">Business</span>
                </div>
              </div>
            )}
            <label className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/80", isBusiness !== "business" && "opacity-60")}>
              <input
                type="checkbox"
                checked={allowReceiptStorage}
                onChange={(e) => setAllowReceiptStorage(e.target.checked)}
                disabled={isBusiness !== "business"}
                className="h-4 w-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-blue-900">事業支出のみ画像を保存する</p>
                <p className="text-[9px] font-bold text-blue-400">容量節約のため、未チェック時は画像を保存しません</p>
              </div>
            </label>
          </div>

          <button onClick={handleSave} disabled={isSaving} className="w-full bg-gray-900 text-white py-6 rounded-[32px] font-black text-sm active:scale-95 transition-all shadow-2xl">
            {isSaving ? "保存中..." : "データベースに登録"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            {/* OCR Toggle */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-4 relative z-20">
              <button
                onClick={() => setShowOcrText(!showOcrText)}
                className="w-full px-6 py-4 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-colors"
              >
                <span>OCR Raw Data</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className={cn("transition-transform duration-300", showOcrText ? "rotate-180" : "")}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* OCR Expanded Content (Overlapping Preview) */}
            {showOcrText && (
              <>
                <div
                  className="fixed inset-0 z-[25]"
                  onClick={() => setShowOcrText(false)}
                />
                <div className="absolute top-[60px] inset-x-0 z-[30] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-gray-100 shadow-2xl p-4">
                    <textarea
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      className="w-full h-80 bg-gray-50 border-none rounded-2xl p-4 text-[10px] font-mono font-medium text-gray-500 resize-none outline-none focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Preview stays below in flow, but z-index is low */}
            <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm relative z-0">
              <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md text-[8px] text-white px-2 py-1 rounded font-black tracking-widest uppercase">Preview</div>
              {previewUrl && <Image src={previewUrl} alt="Receipt" width={0} height={0} sizes="100vw" className="w-full h-auto object-contain bg-gray-900" unoptimized />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
