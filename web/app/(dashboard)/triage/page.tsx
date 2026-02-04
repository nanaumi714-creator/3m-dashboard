"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { fetchVisibleExpenseCategories } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];

export default function TriagePage() {
  const [untriaged, setUntriaged] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [modalRatio, setModalRatio] = useState(100);
  const [modalCategoryId, setModalCategoryId] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*, transaction_business_info(transaction_id)")
        .order("occurred_on", { ascending: false })
        .limit(200);

      if (transactionError) throw transactionError;
      const unjudged = (transactionData as any[]).filter((tx) => !tx.transaction_business_info);
      const categoryData = await fetchVisibleExpenseCategories(supabase);

      setUntriaged(unjudged);
      setCategories(categoryData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openBusinessModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalRatio(100);
    setModalCategoryId("");
    setModalNote("");
  };

  const handleJudge = async (txId: string, isBusiness: boolean, ratio: number, catId: string | null, note: string | null) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("transaction_business_info").insert({
        transaction_id: txId,
        is_business: isBusiness,
        business_ratio: isBusiness ? ratio : 0,
        category_id: catId || null,
        audit_note: note || null,
        judged_at: new Date().toISOString(),
        judged_by: "user"
      });
      if (error) throw error;
      setUntriaged((prev) => prev.filter((t) => t.id !== txId));
      setEditingTx(null);
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 font-bold text-sm">読み込み中...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-24 px-1">
      {/* Header */}
      <div className="mb-8 px-2 overflow-hidden">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">判定待ち</h1>
          <span className="bg-orange-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black">{untriaged.length}</span>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">整理して確定申告を効率化しましょう</p>
      </div>

      {/* List */}
      <div className="space-y-3 px-1">
        {untriaged.map((tx) => (
          <div key={tx.id} className="bg-white rounded-3xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center justify-between group transition-all active:scale-[0.99] hover:border-blue-100">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">
                  {tx.occurred_on.replace(/-/g, '/')}
                </span>
                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                <span className="text-[9px] font-bold text-gray-400 truncate max-w-[100px]">{tx.vendor_raw || "不明"}</span>
              </div>
              <h3 className="text-[12px] font-black text-gray-900 truncate tracking-tight mb-1" title={tx.description}>
                {tx.description}
              </h3>
              <div className="text-[13px] font-black text-gray-900 tracking-tighter">
                ¥{Math.abs(tx.amount_yen).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => openBusinessModal(tx)}
                className="bg-blue-50 text-blue-600 px-3 py-2.5 rounded-xl font-black text-[10px] active:bg-blue-600 active:text-white transition-all shadow-sm shadow-blue-50"
              >
                事業
              </button>
              <button
                onClick={() => handleJudge(tx.id, false, 0, null, null)}
                className="bg-gray-50 text-gray-400 px-3 py-2.5 rounded-xl font-black text-[10px] active:bg-gray-900 active:text-white transition-all underline-none"
              >
                私用
              </button>
            </div>
          </div>
        ))}
      </div>

      {untriaged.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[40px] border border-gray-100 shadow-sm mx-2">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">完了！</h3>
          <p className="text-gray-400 text-xs font-bold mt-1">すべての取引の判定が終わりました。</p>
        </div>
      )}

      {/* Modal - Redesigned for High Density */}
      {editingTx && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm shadow-2xl flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4 animate-in fade-in duration-200" onClick={() => setEditingTx(null)}>
          <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-sm overflow-hidden p-8 animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest mb-2 inline-block">事業判定</span>
                <h2 className="text-lg font-black text-gray-900 tracking-tight truncate">{editingTx.description}</h2>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">{editingTx.vendor_raw || "不明"} / {editingTx.occurred_on}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <span className="text-lg font-black text-gray-900 tracking-tighter">¥{Math.abs(editingTx.amount_yen).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">カテゴリ</label>
                <div className="relative">
                  <select value={modalCategoryId} onChange={(e) => setModalCategoryId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 text-sm appearance-none">
                    <option value="">未選択</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">按分率</label>
                  <span className="text-sm font-black text-blue-600">{modalRatio}% <span className="text-[10px] text-gray-400 ml-1">BUSINESS</span></span>
                </div>
                <div className="px-1">
                  <input type="range" min="0" max="100" step="5" value={modalRatio} onChange={(e) => setModalRatio(Number(e.target.value))} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
              </div>

              <button
                disabled={isSubmitting}
                onClick={() => handleJudge(editingTx.id, true, modalRatio, modalCategoryId, modalNote)}
                className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black text-sm active:scale-[0.98] transition-all shadow-xl shadow-gray-200 mt-4 disabled:opacity-50"
              >
                {isSubmitting ? "保存中..." : "判定を確定する"}
              </button>
              <button onClick={() => setEditingTx(null)} className="w-full text-center text-[10px] font-black text-gray-300 hover:text-gray-900 py-4 uppercase tracking-widest">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
