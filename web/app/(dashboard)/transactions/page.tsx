"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { fetchVisibleExpenseCategories } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";
import { TransactionSkeleton } from "../components/Skeleton";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  payment_methods: Database["public"]["Tables"]["payment_methods"]["Row"] | null;
  transaction_business_info:
  | Database["public"]["Tables"]["transaction_business_info"]["Row"]
  | null;
  receipts: { ocr_text: string | null }[];
};

type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];

function getExpenseTypeBadge(tbi: Transaction["transaction_business_info"]): {
  label: string;
  className: string;
} {
  if (!tbi) return { label: "未判定", className: "bg-gray-100 text-gray-800" };
  if (!tbi.is_business) return { label: "プライベート", className: "bg-purple-100 text-purple-800" };
  if ((tbi.business_ratio ?? 100) < 100) return { label: `按分 ${tbi.business_ratio ?? 0}%`, className: "bg-blue-100 text-blue-800" };
  return { label: "事業用", className: "bg-blue-600 text-white" };
}

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const oneMonthAgoDate = new Date();
  oneMonthAgoDate.setMonth(now.getMonth() - 1);
  const oneMonthAgo = oneMonthAgoDate.toISOString().split('T')[0];

  const [from, setFrom] = useState(oneMonthAgo);
  const [to, setTo] = useState(today);
  const [onlyUntriaged, setOnlyUntriaged] = useState(false);
  const [minAmount] = useState("");
  const [maxAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [includeOcr] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Batch selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

  // Debounce search input
  const handleSearch = useDebouncedCallback((value: string) => {
    setQuery(value);
    setPage(1);
  }, 300);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchVisibleExpenseCategories(supabase);
        setCategories(data);
      } catch (err) { console.error(err); }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setSelectedIds(new Set());
      try {
        let q = supabase.from("transactions").select("*, payment_methods(*), transaction_business_info(*), receipts(ocr_text)", { count: "exact" });
        if (query) {
          const searchFilters = [`description.ilike.%${query}%`, `vendor_raw.ilike.%${query}%`];
          if (includeOcr) searchFilters.push(`receipts.ocr_text.ilike.%${query}%`);
          q = q.or(searchFilters.join(","));
        }
        if (from) q = q.gte("occurred_on", from);
        if (to) q = q.lte("occurred_on", to);
        if (minAmount) q = q.gte("amount_yen", Number(minAmount));
        if (maxAmount) q = q.lte("amount_yen", Number(maxAmount));
        if (categoryId) q = q.eq("category_id", categoryId);

        const fromIdx = (page - 1) * perPage;
        const toIdx = fromIdx + perPage - 1;
        q = q.range(fromIdx, toIdx).order("occurred_on", { ascending: false });

        const { data, error, count } = await q;
        if (error) throw error;

        let validData = (data as unknown) as Transaction[];
        if (onlyUntriaged) validData = validData.filter(t => !t.transaction_business_info);
        setTransactions(validData || []);
        setTotalCount(count || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, [query, from, to, page, onlyUntriaged, minAmount, maxAmount, categoryId, includeOcr]);

  const pageCount = Math.max(1, Math.ceil(totalCount / perPage));

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === transactions.length && transactions.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(transactions.map((t) => t.id)));
  };

  const handleBatchUpdate = async (updates: Partial<Database["public"]["Tables"]["transaction_business_info"]["Insert"]>) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件を更新しますか？`)) return;
    // setIsUpdatingBatch(true);
    try {
      if (updates.category_id !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: categoryError } = await (supabase as any)
          .from("transactions")
          .update({ category_id: updates.category_id ?? null })
          .in("id", Array.from(selectedIds));
        if (categoryError) throw categoryError;
      }

      const records = Array.from(selectedIds).map(id => ({
        transaction_id: id,
        is_business: updates.is_business ?? true,
        business_ratio: updates.business_ratio ?? 100,
        judged_by: "batch_action",
        judged_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("transaction_business_info").upsert(records, { onConflict: "transaction_id" });
      if (error) throw error;
      window.location.reload();
    } catch { alert("更新に失敗しました。"); } finally {
      // setIsUpdatingBatch(false); 
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`「${description}」を削除しますか？`)) return;
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      window.location.reload();
    } catch { alert("削除に失敗しました。"); }
  };

  /*
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件を削除しますか？`)) return;
    setIsUpdatingBatch(true);
    try {
      const { error } = await supabase.from("transactions").delete().in("id", Array.from(selectedIds));
      if (error) throw error;
      window.location.reload();
    } catch { alert("一括削除に失敗しました。"); } finally { setIsUpdatingBatch(false); }
  };
  */

  if (loading) return (
    <div className="min-h-screen pb-24 px-1 md:py-8">
      <TransactionSkeleton />
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-1 md:px-4 py-4 md:py-8">
        {/* Title & Actions */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-2">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">支出一覧</h1>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">{totalCount}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[32px] p-4 md:p-8 shadow-sm border border-gray-100 mb-6 mx-1">
          <div className="flex items-center gap-3 mb-6 bg-gray-50 rounded-2xl p-1 pr-3 border border-gray-100 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <div className="pl-3 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <input
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); handleSearch(e.target.value); }}
              placeholder="内容や店名で検索..."
              className="w-full bg-transparent border-none py-3 px-1 focus:ring-0 text-gray-900 font-bold placeholder:text-gray-300 text-xs"
            />
            <button
              onClick={() => setOnlyUntriaged(!onlyUntriaged)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all shrink-0",
                onlyUntriaged ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400"
              )}
            >
              未判定のみ
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Period Start</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 text-[11px]" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Period End</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 text-[11px]" />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 text-[11px] appearance-none">
                <option value="">すべて</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions View */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mx-1">
          {/* Detailed Table for Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 w-4"><input type="checkbox" checked={transactions.length > 0 && selectedIds.size === transactions.length} onChange={toggleAll} className="rounded border-gray-200 text-blue-600 w-4 h-4" /></th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">日付</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">概要</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">支払手段</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">金額</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">判定</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => {
                  const isExpense = tx.amount_yen < 0;
                  const tbi = tx.transaction_business_info;
                  const expenseType = getExpenseTypeBadge(tbi);
                  return (
                    <tr key={tx.id} className={cn("hover:bg-blue-50/20 transition-colors", selectedIds.has(tx.id) && "bg-blue-50/40")}>
                      <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(tx.id)} onChange={() => toggleSelection(tx.id)} className="rounded border-gray-200 text-blue-600 w-4 h-4" /></td>
                      <td className="px-4 py-4 whitespace-nowrap"><span className="text-sm font-bold text-gray-900">{tx.occurred_on.slice(5)}</span></td>
                      <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-bold text-gray-800">{tx.description}</span><span className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">{tx.vendor_raw || '-'}</span></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="text-xs font-bold text-gray-500">{tx.payment_methods?.name || "-"}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><span className={cn("text-sm font-bold", isExpense ? "text-gray-900" : "text-emerald-500")}>{isExpense ? "-" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}</span></td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap", expenseType.className)}>
                          {expenseType.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(tx.id, tx.description)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 11v-6m4 6v-6" /></svg></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* High-Density List for Mobile */}
          <div className="lg:hidden divide-y divide-gray-50">
            {transactions.map(tx => {
              const isExpense = tx.amount_yen < 0;
              const tbi = tx.transaction_business_info;
              const expenseType = getExpenseTypeBadge(tbi);
              const dateObj = new Date(tx.occurred_on);
              const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

              return (
                <div key={tx.id} className={cn("flex items-center gap-3 p-4 active:bg-gray-50 transition-colors group", selectedIds.has(tx.id) && "bg-blue-50/50")}>
                  <button onClick={(e) => { e.preventDefault(); toggleSelection(tx.id); }} className={cn("w-4 h-4 rounded-md border-2 transition-all shrink-0", selectedIds.has(tx.id) ? "bg-blue-600 border-blue-600" : "border-gray-100 bg-white")}>
                    {selectedIds.has(tx.id) && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="p-0.5"><polyline points="20 6 9 17 4 12" /></svg>}
                  </button>
                  <Link href={`/transactions/${tx.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="text-[12px] font-black text-gray-900 truncate tracking-tight">{tx.description}</h4>
                        <span className={cn("text-xs font-black tracking-tight shrink-0", isExpense ? "text-gray-900" : "text-emerald-500")}>
                          {isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-[8px] text-gray-400 font-bold uppercase truncate">{tx.vendor_raw || "不明"}</span>
                          <span className="text-[8px] text-gray-400 font-bold shrink-0">{dateStr} ({tx.payment_methods?.name || "-"})</span>
                        </div>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0", expenseType.className)}>
                          {expenseType.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {transactions.length === 0 && <div className="py-20 flex flex-col items-center justify-center"><p className="text-gray-400 font-bold">データが見つかりません</p></div>}
        </div>

        {/* Pagination bar */}
        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 disabled:opacity-30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <span className="text-[10px] font-black text-gray-400 px-4">{page} / {pageCount}</span>
            <button disabled={page === pageCount} onClick={() => setPage(page + 1)} className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 disabled:opacity-30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl rounded-[32px] shadow-2xl px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 z-[101] border border-white/10 w-[92%] max-w-sm">
          <div className="flex flex-col leading-none border-r border-white/10 pr-6">
            <span className="text-[9px] font-bold text-blue-400 uppercase mb-1">SELECTED</span>
            <span className="text-sm font-black text-white">{selectedIds.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBatchUpdate({ is_business: true })} className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-xl">BIZ</button>
            <button onClick={() => handleBatchUpdate({ is_business: false })} className="bg-white/10 text-white text-[10px] font-black px-4 py-2 rounded-xl">PRIV</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-white/30 p-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
      )}
    </div>
  );
}
