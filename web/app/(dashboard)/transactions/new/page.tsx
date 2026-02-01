"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const SOURCE_TYPE = "manual";

type PaymentMethod = { id: string; name: string; };
type Category = { id: string; name: string; };

function normalizeVendor(raw: string): string {
  return raw.slice(0, 30).normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function TransactionNewPage() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().split('T')[0]);
  const [amountYen, setAmountYen] = useState("");
  const [description, setDescription] = useState("");
  const [vendorRaw, setVendorRaw] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isBusiness, setIsBusiness] = useState<"business" | "personal" | "pending">("pending");
  const [businessRatio, setBusinessRatio] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const [{ data: methods }, { data: cats }] = await Promise.all([
        supabase.from("payment_methods").select("id, name").eq("is_active", true).order("name"),
        supabase.from("expense_categories").select("id, name").eq("is_active", true).order("name"),
      ]);
      setPaymentMethods((methods || []) as PaymentMethod[]);
      setCategories((cats || []) as Category[]);
    }
    loadOptions();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    if (!occurredOn || !amountYen || !paymentMethodId || !description.trim()) {
      setStatusMessage("必須項目を入力してください。");
      return;
    }
    const rawAmount = Number(amountYen);
    const normalizedAmount = rawAmount < 0 ? rawAmount : -Math.abs(rawAmount);

    setSubmitting(true);
    try {
      const vendorValue = vendorRaw.trim() || description.trim();
      const vendorNorm = normalizeVendor(vendorValue);
      const { data: sourceInsert, error: sourceError } = await supabase.from("import_sources").insert({ source_type: SOURCE_TYPE, metadata: { created_by: "gui_manual" } }).select("id").single();
      if (sourceError || !sourceInsert) throw sourceError || new Error("Source error");

      const fingerprint = await sha256([occurredOn, normalizedAmount, paymentMethodId, vendorNorm, SOURCE_TYPE, Date.now()].join("|"));
      const { data: transaction, error } = await supabase.from("transactions").insert({
        occurred_on: occurredOn, amount_yen: normalizedAmount, description: description.trim(), payment_method_id: paymentMethodId, import_source_id: sourceInsert.id, vendor_raw: vendorValue, vendor_norm: vendorNorm, fingerprint,
      }).select("id").single();
      if (error || !transaction) throw error || new Error("TX error");

      if (isBusiness !== "pending") {
        await supabase.from("transaction_business_info").insert({
          transaction_id: transaction.id, is_business: isBusiness === "business", business_ratio: isBusiness === "business" ? Number(businessRatio) : 0, category_id: categoryId || null, judged_by: "manual_entry", judged_at: new Date().toISOString()
        });
      }
      setStatusMessage("登録が完了しました。");
      router.push("/transactions");
    } catch (err: any) {
      setStatusMessage(err.message || "エラーが発生しました。");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-xl mx-auto pb-24 px-2">
      {/* High Density Header */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">取引登録</h1>
          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Manual</span>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">詳細情報を入力してください</p>
      </div>

      <div className="bg-white rounded-[40px] p-6 md:p-10 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">取引日</label>
              <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-900" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">金額 (JPY)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">¥</span>
                <input type="number" value={amountYen} onChange={(e) => setAmountYen(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-5 py-4 font-black text-gray-900 text-xl" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">内容・概要</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-900" placeholder="Apple Store..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">支払手段</label>
                <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold text-gray-900 text-xs appearance-none">
                  <option value="">選択</option>
                  {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">カテゴリ</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold text-gray-900 text-xs appearance-none">
                  <option value="">未選択</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 mt-4 h-density-box">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-4 block">Classification</span>
            <div className="flex flex-col gap-4">
              <select value={isBusiness} onChange={(e: any) => setIsBusiness(e.target.value)} className="w-full bg-white border-none rounded-2xl px-4 py-4 font-black text-blue-900 text-xs appearance-none">
                <option value="business">事業経費</option>
                <option value="personal">通常支出</option>
                <option value="pending">後で判定</option>
              </select>
              {isBusiness === "business" && (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                  <input type="range" min="0" max="100" step="5" value={businessRatio} onChange={(e) => setBusinessRatio(e.target.value)} className="flex-1 h-1.5 bg-blue-100 rounded-lg appearance-none accent-blue-600" />
                  <span className="text-xs font-black text-blue-900 min-w-[3rem] text-right">{businessRatio}%</span>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black text-sm active:scale-[0.98] transition-all shadow-xl shadow-gray-200 mt-4 disabled:opacity-50">
            {submitting ? "保存中..." : "登録を確定する"}
          </button>
          {statusMessage && <p className="text-center text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{statusMessage}</p>}
        </form>
      </div>
    </div>
  );
}
