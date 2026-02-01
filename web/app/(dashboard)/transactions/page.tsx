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
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-400 font-bold tracking-tight">取引データを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title Block */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">取引履歴</h1>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{totalCount} 件</span>
            </div>
            <p className="text-gray-500 font-medium tracking-tight">
              全取引の履歴を確認・検索・出力できます。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/receipts/upload"
              className="flex items-center gap-2 bg-white border border-gray-100 text-gray-600 px-5 py-3 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-all font-bold text-sm shadow-sm active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15h6" />
              </svg>
              レシート登録
            </Link>
            <Link
              href="/transactions/new"
              className="flex items-center gap-2 bg-white border border-gray-100 text-gray-600 px-5 py-3 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-all font-bold text-sm shadow-sm active:scale-[0.98]"
            >
              手入力
            </Link>
            <Link
              href="/imports"
              className="flex items-center gap-2 bg-white border border-gray-100 text-gray-600 px-5 py-3 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-all font-bold text-sm shadow-sm active:scale-[0.98]"
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
                    body: JSON.stringify({ query, from, to, onlyUntriaged, minAmount, maxAmount, categoryId, includeOcr }),
                  });
                  if (!response.ok) throw new Error("エクスポートに失敗しました。");
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "エラーが発生しました。");
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-2xl hover:bg-gray-200 transition-all font-bold text-sm shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {exporting ? "出力中..." : "CSVエクスポート"}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-4 mb-6 bg-gray-50 rounded-2xl p-1 pr-4 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <div className="pl-4 text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="店名、内容、OCRテキストを検索..."
              className="w-full bg-transparent border-none py-3 px-2 focus:ring-0 text-gray-900 font-bold placeholder:text-gray-300 placeholder:font-medium text-sm"
            />
            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeOcr}
                  onChange={(event) => {
                    setIncludeOcr(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-0 border-gray-200 rounded-md"
                />
                <span className="text-[10px] font-bold text-gray-400">OCRを含む</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 ml-1">開始日</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 ml-1">終了日</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 ml-1">カテゴリ</label>
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer text-sm"
              >
                <option value="">すべて</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 ml-1">金額範囲</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                  placeholder="最小"
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm"
                />
                <span className="text-gray-300 font-bold">~</span>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                  placeholder="最大"
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 ml-1">保存した条件</label>
              <div className="flex flex-col gap-2">
                <select
                  value={selectedSearchId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedSearchId(id);
                    const selected = savedSearches.find((search) => search.id === id);
                    if (selected) {
                      setSearchInput(selected.query || "");
                      setQuery(selected.query || "");
                      const filters = (selected.filters || {}) as any;
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
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer text-sm"
                >
                  <option value="">未選択</option>
                  {savedSearches.map((search) => (
                    <option key={search.id} value={search.id}>{search.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowSaveSearch(true); setSaveSearchName(query ? `${query} の条件` : ""); }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors ml-1 uppercase"
                >
                  条件を保存
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={cn(
                "w-10 h-6 rounded-full transition-all flex items-center px-1",
                onlyUntriaged ? "bg-blue-600" : "bg-gray-200"
              )}>
                <input
                  type="checkbox"
                  checked={onlyUntriaged}
                  onChange={(e) => { setOnlyUntriaged(e.target.checked); setPage(1); }}
                  className="hidden"
                />
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full transition-transform",
                  onlyUntriaged ? "translate-x-4" : "translate-x-0"
                )} />
              </div>
              <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">未判定のみ表示</span>
            </label>
          </div>
        </div>

        {/* Transactions Table Card */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 w-4">
                    <input
                      type="checkbox"
                      checked={transactions.length > 0 && selectedIds.size === transactions.length}
                      onChange={toggleAll}
                      className="rounded border-gray-200 text-blue-600 focus:ring-0 w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">日付</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">内容 / 概要</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">支払手段</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">金額</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">判定 / 状況</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">店名・先</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {transactions.map((tx) => {
                  const isExpense = tx.amount_yen < 0;
                  const tbi = tx.transaction_business_info;
                  const statusLabel = !tbi ? "未判定" : !tbi.is_business ? "個人" : tbi.business_ratio < 100 ? "分" : "事業";
                  const categoryName = tbi?.category_id ? categories.find(c => c.id === tbi.category_id)?.name : null;

                  return (
                    <tr key={tx.id} className={cn("hover:bg-blue-50/30 transition-colors", selectedIds.has(tx.id) && "bg-blue-50/50")}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelection(tx.id)}
                          className="rounded border-gray-200 text-blue-600 focus:ring-0 w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 leading-none">{tx.occurred_on.split('-')[1]}/{tx.occurred_on.split('-')[2]}</span>
                          <span className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">{tx.occurred_on.split('-')[0]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="group flex flex-col max-w-[200px]"
                        >
                          <span className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate mb-0.5">{tx.description}</span>
                          <span className="text-[9px] text-gray-300 font-medium tracking-tight">#{tx.id.slice(0, 8)}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-gray-600">{tx.payment_methods?.name || "-"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={cn(
                          "text-sm font-bold",
                          isExpense ? "text-gray-900" : "text-emerald-500"
                        )}>
                          {isExpense ? "-" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                        </div>
                        {tbi?.is_business && tbi.business_ratio > 0 && tbi.business_ratio < 100 && (
                          <div className="text-[8px] text-blue-500 font-bold mt-0.5 tracking-tighter">
                            事業分: ¥{Math.abs(Math.floor(tx.amount_yen * (tbi.business_ratio / 100))).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold leading-none w-fit",
                            !tbi ? "bg-gray-100 text-gray-400" :
                              !tbi.is_business ? "bg-amber-50 text-amber-600" :
                                tbi.business_ratio < 100 ? "bg-blue-50 text-blue-600" :
                                  "bg-emerald-50 text-emerald-600"
                          )}>
                            {statusLabel}
                            {tbi?.is_business && tbi.business_ratio < 100 && ` (${tbi.business_ratio}%)`}
                          </span>
                          {categoryName && (
                            <span className="text-[9px] text-gray-400 font-medium truncate max-w-[80px]">
                              {categoryName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500">
                        {tx.vendor_raw || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(tx.id, tx.description)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 11v-6m4 6v-6" />
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
            <div className="py-20 flex flex-col items-center justify-center">
              <p className="text-gray-400 font-bold">データが見つかりません</p>
            </div>
          )}

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <div className="text-[10px] font-bold text-gray-400">{page} / {pageCount} ページ</div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-all shadow-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button
                  disabled={page === pageCount}
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-all shadow-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-3xl shadow-2xl px-8 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 z-50">
          <div className="flex flex-col leading-none border-r border-white/10 pr-6">
            <span className="text-[9px] font-bold text-blue-400 uppercase mb-1">選択中</span>
            <span className="text-base font-bold text-white">{selectedIds.size} 件</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleBatchUpdate({ is_business: false })}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all"
            >
              生活費に設定
            </button>
            <div className="flex items-center gap-1.5">
              {categories.slice(0, 2).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleBatchUpdate({ is_business: true, category_id: cat.id })}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <button
            onClick={handleBatchDelete}
            className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-2.5 text-white/50 hover:text-white transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Save Search Modal */}
      {showSaveSearch && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black mb-1 text-gray-900 tracking-tight">検索条件を保存</h2>
            <p className="text-gray-400 text-xs font-medium mb-6">現在のフィルター設定をプリセットとして保存します。</p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!saveSearchName.trim()) return;
                setSavingSearch(true);
                try {
                  const filters = { from, to, onlyUntriaged, minAmount, maxAmount, categoryId, includeOcr };
                  const { data, error } = await supabase.from("saved_searches").insert({
                    name: saveSearchName.trim(),
                    query: query || null,
                    filters,
                  }).select("*").single();
                  if (error) throw error;
                  if (data) {
                    setSavedSearches((prev) => [data, ...prev]);
                    setSelectedSearchId(data.id);
                  }
                  setShowSaveSearch(false);
                } catch (err) { alert("保存に失敗しました。"); } finally { setSavingSearch(false); }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                autoFocus
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900"
                placeholder="名称を入力（例: 交通費）"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveSearch(false)}
                  className="flex-1 py-4 text-gray-400 font-bold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingSearch}
                  className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex-[2]"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
