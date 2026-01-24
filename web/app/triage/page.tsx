"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];

export default function TriagePage() {
  const [untriaged, setUntriaged] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [ratio, setRatio] = useState(100);
  const [note, setNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch unjudged transactions and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch untriaged transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*, transaction_business_info(transaction_id)")
        .order("occurred_on", { ascending: false })
        .limit(200);

      if (transactionError) throw transactionError;

      // Filter those who have NO business info
      const unjudged = (transactionData as any[]).filter(
        (tx) => !tx.transaction_business_info
      );

      // Fetch active categories
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

  const handleJudge = async (txId: string, isBusiness: boolean) => {
    try {
      const { error } = await supabase
        .from("transaction_business_info")
        .insert({
          transaction_id: txId,
          is_business: isBusiness,
          business_ratio: isBusiness ? ratio : 0,
          category_id: isBusiness && selectedCategoryId ? selectedCategoryId : null,
          audit_note: note || null,
          judged_at: new Date().toISOString(),
          judged_by: "user" // Phase 2: hardcoded user, Phase 4: actual auth
        });

      if (error) throw error;

      // Remove from list
      setUntriaged((prev) => prev.filter((t) => t.id !== txId));

    } catch (e) {
      console.error("Failed to judge", e);
      alert("保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">未判定キュー</h1>
          <p className="text-gray-600">
            未判定取引 <span className="font-semibold text-blue-600">({untriaged.length}件)</span> に対して事業判定・カテゴリ・按分を記録します
          </p>
        </div>

        {/* Settings Panel */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">判定設定 (共通)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                事業割合 (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={ratio}
                onChange={(event) => setRatio(Number(event.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ
              </label>
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- カテゴリを選択 --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ
              </label>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="判定理由や備考"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {untriaged.map((tx) => (
            <div key={tx.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {tx.occurred_on}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      ¥{tx.amount_yen.toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {tx.description}
                  </h3>
                  {tx.vendor_norm && (
                    <p className="text-sm text-gray-600 mb-3">
                      ベンダー: {tx.vendor_norm}
                    </p>
                  )}
                </div>
                <div className="flex space-x-3 ml-6">
                  <button
                    onClick={() => handleJudge(tx.id, true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                    title={`事業経費として記録 (${ratio}%${selectedCategoryId ? ', カテゴリ: ' + categories.find(c => c.id === selectedCategoryId)?.name : ''})`}
                  >
                    事業 ({ratio}%)
                  </button>
                  <button
                    onClick={() => handleJudge(tx.id, false)}
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    私用 (0%)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {untriaged.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">すべて完了！</h3>
            <p className="text-gray-500">未判定の取引はありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

