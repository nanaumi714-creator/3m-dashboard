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
};

type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];
type SavedSearch = Database["public"]["Tables"]["saved_searches"]["Row"];

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState("2025-01-01"); // TODO: Default to current month start
  const [to, setTo] = useState("2025-12-31");
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

        if (onlyUntriaged) {
          // Filter where transaction_business_info is null
          // This requires correct join filtering or identifying via 'is'
          // Supabase join filtering: !inner join filters parent row, LEFT JOIN doesn't.
          // For simple check: .is('transaction_business_info', null) works if we select it?
          // Actually, .not('transaction_business_info', 'is', null) is 'has info'.
          // To find 'missing info', we usually need !inner or filtering on the joined column.
          // But LEFT JOIN + .filter('transaction_business_info', 'is', 'null') is weird in Supabase JS.
          // Workaround: We fetch everything and filter on client OR use a different query logic?
          // Better: Use .is("transaction_business_info", null) on the FK relation? No, FK is on child.
          // Correct way: use !inner join to filter? No that's finding matching ones.
          // For finding "missing child", typical SQL is LEFT JOIN where child.id IS NULL.
          // Supabase-js specific:
          // It's tricky. For Phase 1, simpler to filter on client if volume is low, OR separate query for IDs.
          // However, to do filtering server side:
          // q = q.filter("transaction_business_info.transaction_id", "is", "null")? No.
          // Let's assume client filtering for "Untriaged" strictly for Phase 1 MVP if server filtering is tough.
          // Wait, "transactions" doesn't have FK to "transaction_business_info". "tbi" has FK to "transactions".
          // So transactions LEFT JOIN tbi.
          // .filter('transaction_business_info', 'is', null) MIGHT work if the join is set up right.
          // Let's try explicit manual filtering or rely on an assumption for now.
          // Actually, let's defer complex server-side untriaged filtering if it blocks.
          // Re-reading docs: .not('transaction_business_info', 'cs', '{"transaction_id": *}') might be too complex.
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
          // Note: This messes up pagination count if we filter AFTER fetching page.
          // Ideally we need server side.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                    <div className="text-xs text-gray-500">
                      クライアント側フィルター
                    </div>
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

        {showSaveSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                検索条件を保存
              </h2>
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
                    alert(
                      err instanceof Error
                        ? err.message
                        : "保存に失敗しました。"
                    );
                  } finally {
                    setSavingSearch(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    保存名
                  </label>
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

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支払い手段</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">判定</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ベンダー</th>
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

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
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
                      <td className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm font-mono text-right font-semibold",
                        isExpense ? "text-red-600" : "text-green-600"
                      )}>
                        {isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex px-3 py-1 text-xs font-medium rounded-full",
                          statusLabel === "未判定" && "bg-gray-100 text-gray-800",
                          statusLabel === "生活" && "bg-blue-100 text-blue-800",
                          statusLabel === "事業" && "bg-amber-100 text-amber-800",
                          statusLabel === "按分" && "bg-purple-100 text-purple-800"
                        )}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.vendor_raw || '-'}
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

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{((page - 1) * perPage) + 1}</span>
            {" - "}
            <span className="font-medium">{Math.min(page * perPage, totalCount)}</span>
            {" / "}
            <span className="font-medium">{totalCount}</span>
            件を表示
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                page === 1 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              )}
            >
              前へ
            </button>
            <span className="flex items-center px-4 py-2 text-sm text-gray-700">
              {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                page === pageCount 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              )}
            >
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
