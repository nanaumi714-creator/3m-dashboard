"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  payment_methods: Database["public"]["Tables"]["payment_methods"]["Row"] | null;
  transaction_business_info:
  | Database["public"]["Tables"]["transaction_business_info"]["Row"]
  | null;
  receipts: { ocr_text: string | null }[];
};

type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];
type SavedSearch = Database["public"]["Tables"]["saved_searches"]["Row"];

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const now = new Date();
  const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const oneMonthAgoDate = new Date();
  oneMonthAgoDate.setMonth(now.getMonth() - 1);
  const oneMonthAgo = oneMonthAgoDate.toISOString().split('T')[0];

  const [from, setFrom] = useState(oneMonthAgo);
  const [to, setTo] = useState(today);
  const [onlyUntriaged, setOnlyUntriaged] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [includeOcr, setIncludeOcr] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [exporting, setExporting] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState("");
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);

  // Batch selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

  // Debounce search input
  const handleSearch = useDebouncedCallback((value: string) => {
    setQuery(value);
    setPage(1); // Reset to page 1 on search change
  }, 300);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from("expense_categories")
          .select("*")
          .order("name");
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function loadSavedSearches() {
      try {
        const { data, error } = await supabase
          .from("saved_searches")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setSavedSearches(data || []);
      } catch (err) {
        console.error("Failed to load saved searches", err);
      }
    }

    loadSavedSearches();
  }, []);

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      // Clear selection when filters change (optional but safer)
      setSelectedIds(new Set());
      try {
        let q = supabase
          .from("transactions")
          .select(
            "*, payment_methods(*), transaction_business_info(*), receipts(ocr_text)",
            { count: "exact" }
          );

        if (query) {
          // Vendor OR Description match
          const searchFilters = [
            `description.ilike.%${query}%`,
            `vendor_raw.ilike.%${query}%`,
          ];
          if (includeOcr) {
            searchFilters.push(`receipts.ocr_text.ilike.%${query}%`);
          }
          q = q.or(searchFilters.join(","));
        }

        if (from) q = q.gte("occurred_on", from);
        if (to) q = q.lte("occurred_on", to);
        if (minAmount) q = q.gte("amount_yen", Number(minAmount));
        if (maxAmount) q = q.lte("amount_yen", Number(maxAmount));
        if (categoryId) {
          q = q.eq("transaction_business_info.category_id", categoryId);
        }

        // Pagination
        const fromIdx = (page - 1) * perPage;
        const toIdx = fromIdx + perPage - 1;
        q = q.range(fromIdx, toIdx).order("occurred_on", { ascending: false });

        const { data, error, count } = await q;

        if (error) throw error;

        let validData = (data as unknown) as Transaction[]; // Casting for extended types

        if (onlyUntriaged) {
          // Client side filter for now as workaround
          validData = validData.filter(t => !t.transaction_business_info);
        }

        setTransactions(validData || []);
        setTotalCount(count || 0);

      } catch (e) {
        console.error("Fetch error", e);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [
    query,
    from,
    to,
    page,
    onlyUntriaged,
    minAmount,
    maxAmount,
    categoryId,
    includeOcr,
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / perPage));

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === transactions.length && transactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleBatchUpdate = async (updates: Partial<Database["public"]["Tables"]["transaction_business_info"]["Insert"]>) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の取引を更新しますか？`)) return;

    setIsUpdatingBatch(true);
    try {
      const records = Array.from(selectedIds).map(id => ({
        transaction_id: id,
        is_business: updates.is_business ?? true,
        business_ratio: updates.business_ratio ?? 100, // Default to 100 if business
        category_id: updates.category_id ?? null,
        judged_by: "batch_action",
        judged_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("transaction_business_info")
        .upsert(records, { onConflict: "transaction_id" });

      if (error) throw error;

      // Refresh data
      window.location.reload();

    } catch (err) {
      console.error("Batch update failed", err);
      alert("一括更新に失敗しました。");
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`「${description}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("削除しました。");
      window.location.reload();
    } catch (err) {
      console.error("Delete failed", err);
      alert("削除に失敗しました。");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の取引を削除してもよろしいですか？\n関連するレシートデータも参照できなくなります。\nこの操作は取り消せません。`)) return;

    setIsUpdatingBatch(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      alert(`${selectedIds.size}件の取引を削除しました。`);
      window.location.reload();
    } catch (err) {
      console.error("Batch delete failed", err);
      alert("一括削除に失敗しました。");
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">取引履歴</h1>
            <p className="text-gray-600">
              全取引の履歴を確認・検索できます（合計:{" "}
              <span className="font-semibold text-blue-600">{totalCount}件</span>
              ）
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/transactions/new"
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              手入力
            </Link>
            <Link
              href="/imports"
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              CSVインポート
            </Link>
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  const response = await fetch("/api/exports/transactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      query,
                      from,
                      to,
                      onlyUntriaged,
                      minAmount,
                      maxAmount,
                      categoryId,
                      includeOcr,
                    }),
                  });
                  if (!response.ok) {
                    const body = await response.json();
                    throw new Error(body.error || "エクスポートに失敗しました。");
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "transactions.csv";
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error("Export error", err);
                  alert(
                    err instanceof Error
                      ? err.message
                      : "エクスポートに失敗しました。"
                  );
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50"
            >
              {exporting ? "エクスポート中..." : "CSVエクスポート"}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-base font-medium text-gray-900 mb-3">フィルター</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                検索
              </label>
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="ベンダーやメモを検索"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={includeOcr}
                  onChange={(event) => {
                    setIncludeOcr(event.target.checked);
                    setPage(1);
                  }}
                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                OCR本文も検索対象にする
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                期間（開始）
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                期間（終了）
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                表示オプション
              </label>
              <div className="flex items-center pt-1">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyUntriaged}
                    onChange={(e) => {
                      setOnlyUntriaged(e.target.checked);
                      setPage(1);
                    }}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-2">
                    <span className="text-xs font-medium text-gray-700">
                      未判定のみ表示
                    </span>
                  </div>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                金額（最小）
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setPage(1);
                }}
                placeholder="例: -5000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                金額（最大）
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setPage(1);
                }}
                placeholder="例: 0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                カテゴリ
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">すべて</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                保存検索
              </label>
              <select
                value={selectedSearchId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedSearchId(id);
                  const selected = savedSearches.find((search) => search.id === id);
                  if (selected) {
                    setSearchInput(selected.query || "");
                    setQuery(selected.query || "");
                    const filters = (selected.filters || {}) as {
                      from?: string;
                      to?: string;
                      onlyUntriaged?: boolean;
                      minAmount?: string;
                      maxAmount?: string;
                      categoryId?: string;
                      includeOcr?: boolean;
                    };
                    setFrom(filters.from || "");
                    setTo(filters.to || "");
                    setOnlyUntriaged(Boolean(filters.onlyUntriaged));
                    setMinAmount(filters.minAmount || "");
                    setMaxAmount(filters.maxAmount || "");
                    setCategoryId(filters.categoryId || "");
                    setIncludeOcr(filters.includeOcr ?? true);
                    setPage(1);
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">未選択</option>
                {savedSearches.map((search) => (
                  <option key={search.id} value={search.id}>
                    {search.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setShowSaveSearch(true);
                  setSaveSearchName(query ? `${query} 検索` : "");
                }}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                現在の検索条件を保存
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 w-4">
                    <input
                      type="checkbox"
                      checked={
                        transactions.length > 0 &&
                        selectedIds.size === transactions.length
                      }
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支払い手段</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">判定</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ベンダー</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => {
                  const isExpense = tx.amount_yen < 0;
                  const tbi = tx.transaction_business_info;
                  const statusLabel = !tbi
                    ? "未判定"
                    : !tbi.is_business
                      ? "生活"
                      : tbi.business_ratio < 100
                        ? "按分"
                        : "事業";

                  const categoryName = tbi?.category_id
                    ? categories.find(c => c.id === tbi.category_id)?.name
                    : null;

                  return (
                    <tr key={tx.id} className={cn("hover:bg-gray-50", selectedIds.has(tx.id) && "bg-blue-50")}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelection(tx.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.occurred_on}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {tx.description}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.payment_methods?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={cn(
                          "text-sm font-mono font-semibold",
                          isExpense ? "text-red-600" : "text-green-600"
                        )}>
                          {isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                        </div>
                        {tbi && tbi.is_business && tbi.business_ratio > 0 && tbi.business_ratio < 100 && (
                          <div className="text-[10px] text-gray-500 mt-0.5 space-x-1">
                            <span>事: ¥{Math.abs(Math.floor(tx.amount_yen * (tbi.business_ratio / 100))).toLocaleString()}</span>
                            <span>生: ¥{Math.abs(tx.amount_yen - Math.floor(tx.amount_yen * (tbi.business_ratio / 100))).toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            !tbi
                              ? "bg-gray-100 text-gray-800"
                              : !tbi.is_business
                                ? "bg-purple-100 text-purple-800"
                                : tbi.business_ratio < 100
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                          )}>
                            {statusLabel}
                            {tbi?.is_business && tbi.business_ratio < 100 && ` (${tbi.business_ratio}%)`}
                          </span>
                          {categoryName && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={categoryName}>
                              {categoryName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.vendor_raw || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(tx.id, tx.description)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="削除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📊</div>
              <p className="text-gray-500">条件に一致する取引が見つかりません</p>
              <p className="text-sm text-gray-400">フィルター条件を変更してください</p>
            </div>
          )}
        </div>

        {/* Pagination (lines omitted for brevity) */}
        {/* ... */}
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in z-50">
          <div className="text-sm font-semibold text-gray-900 border-r border-gray-200 pr-4">
            {selectedIds.size} 件選択中
          </div>

          <button
            onClick={() => handleBatchUpdate({ is_business: false })}
            disabled={isUpdatingBatch}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
          >
            生活 (0%)
          </button>

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">事業:</span>
            {categories.slice(0, 3).map(cat => (
              <button
                key={cat.id}
                onClick={() => handleBatchUpdate({ is_business: true, category_id: cat.id })}
                disabled={isUpdatingBatch}
                className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <button
            onClick={handleBatchDelete}
            disabled={isUpdatingBatch}
            className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
          >
            削除
          </button>

          <div className="h-4 w-px bg-gray-200" />

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {showSaveSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Saved Search Modal Content (Same as before) */}
            <h2 className="text-xl font-semibold mb-4 text-gray-900">検索条件を保存</h2>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!saveSearchName.trim()) {
                  alert("検索名を入力してください。");
                  return;
                }
                setSavingSearch(true);
                try {
                  const filters = {
                    from,
                    to,
                    onlyUntriaged,
                    minAmount,
                    maxAmount,
                    categoryId,
                    includeOcr,
                  };
                  const { data, error } = await supabase
                    .from("saved_searches")
                    .insert({
                      name: saveSearchName.trim(),
                      query: query || null,
                      filters,
                    })
                    .select("*")
                    .single();
                  if (error) throw error;
                  if (data) {
                    setSavedSearches((prev) => [data, ...prev]);
                    setSelectedSearchId(data.id);
                  }
                  setShowSaveSearch(false);
                } catch (err) {
                  console.error("Failed to save search", err);
                  alert("保存に失敗しました。");
                } finally {
                  setSavingSearch(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">保存名</label>
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 交通費 2025年"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSaveSearch(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingSearch}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {savingSearch ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
