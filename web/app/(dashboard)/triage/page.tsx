"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

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

  // Fetch unjudged transactions and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*, transaction_business_info(transaction_id)")
        .order("occurred_on", { ascending: false })
        .limit(200);

      if (transactionError) throw transactionError;

      const unjudged = (transactionData as any[]).filter(
        (tx) => !tx.transaction_business_info
      );

      const { data: categoryData, error: categoryError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (categoryError) throw categoryError;

      setUntriaged(unjudged);
      setCategories(categoryData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openBusinessModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalRatio(100);
    setModalCategoryId("");
    setModalNote("");
  };

  const handleJudge = async (
    txId: string,
    isBusiness: boolean,
    ratio: number,
    catId: string | null,
    note: string | null
  ) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("transaction_business_info")
        .insert({
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
      console.error("Failed to judge", e);
      alert("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonal = (tx: Transaction) => {
    if (window.confirm(`「${tx.description}」をプライベート支出（0%）として確定しますか？`)) {
      handleJudge(tx.id, false, 0, null, null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">未判定キュー</h1>
          <p className="text-gray-600">
            判定が必要な取引が <span className="font-bold text-blue-600">{untriaged.length}</span> 件あります
          </p>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {untriaged.map((tx) => (
            <div key={tx.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-semibold text-gray-400 font-mono">
                    {tx.occurred_on}
                  </span>
                  <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                  <span className="text-sm font-bold text-gray-900">
                    ¥{Math.abs(tx.amount_yen).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 truncate pr-4" title={tx.description}>
                  {tx.description}
                </h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => openBusinessModal(tx)}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-bold text-sm shadow-sm"
                >
                  事業経費
                </button>
                <button
                  onClick={() => handlePersonal(tx)}
                  className="bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm"
                >
                  私用
                </button>
              </div>
            </div>
          ))}
        </div>

        {untriaged.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">すべて完了です！</h3>
            <p className="text-gray-500">未判定の取引はありません。</p>
          </div>
        )}
      </div>

      {/* Business Triage Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">事業判定の登録</h2>
                  <p className="text-sm text-gray-500 mt-1">{editingTx.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-mono">{editingTx.occurred_on}</p>
                  <p className="text-lg font-bold text-gray-900">¥{Math.abs(editingTx.amount_yen).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">カテゴリ</label>
                  <select
                    value={modalCategoryId}
                    onChange={(e) => setModalCategoryId(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-900"
                  >
                    <option value="">未選択</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-700">事業按分率</label>
                    <span className="text-sm font-bold text-blue-600">{modalRatio}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={modalRatio}
                    onChange={(e) => setModalRatio(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">メモ</label>
                  <textarea
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="判定の理由や詳細な内容..."
                    rows={2}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-900 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setEditingTx(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleJudge(editingTx.id, true, modalRatio, modalCategoryId, modalNote)}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isSubmitting ? "保存中..." : "判定を確定する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

