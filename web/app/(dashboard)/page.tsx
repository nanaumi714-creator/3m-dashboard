"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Summary = {
  totalMonthly: number;
  businessMonthly: number;
  privateMonthly: number;
  untriagedCount: number;
  totalLifetime: number;
};

type Transaction = {
  id: string;
  occurred_on: string;
  amount_yen: number;
  description: string;
  vendor_raw: string | null;
  payment_methods: { name: string | null } | null;
  transaction_business_info: {
    is_business: boolean;
    business_ratio: number;
    category_id: string | null;
  } | null;
};

function getExpenseTypeBadge(tbi: Transaction["transaction_business_info"]): {
  label: string;
  className: string;
} {
  if (!tbi) return { label: "未判定", className: "bg-gray-100 text-gray-800" };
  if (!tbi.is_business) return { label: "プライベート", className: "bg-purple-100 text-purple-800" };
  if ((tbi.business_ratio ?? 100) < 100) return { label: `按分 ${tbi.business_ratio ?? 0}%`, className: "bg-blue-100 text-blue-800" };
  return { label: "事業", className: "bg-blue-600 text-white" };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    totalMonthly: 0,
    businessMonthly: 0,
    privateMonthly: 0,
    untriagedCount: 0,
    totalLifetime: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      try {
        const [monthlyRes, lifetimeRes, recentRes] = await Promise.all([
          supabase.from("transactions").select("amount_yen, transaction_business_info(is_business, business_ratio)").gte("occurred_on", firstDay).lte("occurred_on", lastDay),
          supabase.from("transactions").select("amount_yen"),
          supabase.from("transactions").select("id, occurred_on, amount_yen, description, vendor_raw, payment_methods(name), transaction_business_info(is_business, business_ratio, category_id)").order("occurred_on", { ascending: false }).limit(5)
        ]);

        // Monthly Calculation
        let mTotal = 0, mBiz = 0, mPriv = 0, mUntriaged = 0;
        monthlyRes.data?.forEach((tx: any) => {
          const amount = tx.amount_yen;
          if (amount >= 0) return;
          mTotal += amount;
          if (!tx.transaction_business_info) {
            mUntriaged++;
            mPriv += amount;
          } else {
            const { is_business, business_ratio } = tx.transaction_business_info;
            if (is_business) {
              const bPart = Math.floor(amount * (business_ratio / 100));
              mBiz += bPart;
              mPriv += (amount - bPart);
            } else {
              mPriv += amount;
            }
          }
        });

        // Lifetime Calculation
        let lTotal = 0;
        lifetimeRes.data?.forEach(tx => { if (tx.amount_yen < 0) lTotal += tx.amount_yen; });

        setSummary({
          totalMonthly: mTotal,
          businessMonthly: mBiz,
          privateMonthly: mPriv,
          untriagedCount: mUntriaged,
          totalLifetime: lTotal
        });
        setRecentTransactions((recentRes.data as any) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 px-1">
        <div className="animate-pulse bg-white h-20 rounded-[32px] border border-gray-100" />
        <div className="grid grid-cols-2 gap-4">
          <div className="animate-pulse bg-white h-40 rounded-[40px] border border-gray-100" />
          <div className="animate-pulse bg-white h-40 rounded-[40px] border border-gray-100" />
        </div>
        <div className="animate-pulse bg-white h-80 rounded-[40px] border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lifetime Total Summary - High Impact */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] p-4 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-100/50 transition-all duration-700" />
        <div className="relative z-10">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Total Lifetime Expenses</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900 tracking-tighter">¥{Math.abs(summary.totalLifetime).toLocaleString()}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">JPY</span>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">準備状況</span>
              <span className="text-xs font-bold text-gray-900">{summary.untriagedCount === 0 ? "整理済み ✨" : `${summary.untriagedCount}件の未判定`}</span>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">今月の事業費</span>
              <span className="text-xs font-bold text-gray-900">¥{Math.abs(summary.businessMonthly).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/transactions" className="bg-white rounded-[24px] md:rounded-[40px] p-4 md:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">今月の支出</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 tracking-tighter">¥{Math.abs(summary.totalMonthly).toLocaleString()}</span>
          </div>
        </Link>
        <Link href="/triage" className="bg-white rounded-[24px] md:rounded-[40px] p-4 md:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98]">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">未判定件数</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-orange-600 tracking-tighter">{summary.untriagedCount} <span className="text-xs">件</span></span>
          </div>
        </Link>
      </div>

      {/* Registration Methods - Clearer on PC, Hidden on Mobile */}
      <div className="hidden md:block bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">データの作成</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/receipts/upload"
            className="group flex flex-col p-6 bg-blue-50 rounded-[32px] hover:bg-blue-100 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <h3 className="text-sm font-black text-blue-900 mb-1">レシートを登録</h3>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">AI Analysis</p>
          </Link>

          <Link
            href="/transactions/new"
            className="group flex flex-col p-6 bg-emerald-50 rounded-[32px] hover:bg-emerald-100 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </div>
            <h3 className="text-sm font-black text-emerald-900 mb-1">手動で追加</h3>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Manual Entry</p>
          </Link>

          <Link
            href="/imports"
            className="group flex flex-col p-6 bg-orange-50 rounded-[32px] hover:bg-orange-100 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <h3 className="text-sm font-black text-orange-900 mb-1">CSV読込</h3>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em]">Import Data</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] p-4 md:p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">最近の支出</h2>
          <Link href="/transactions" className="text-[10px] font-black text-blue-600 px-3 py-1.5 bg-blue-50 rounded-xl uppercase tracking-widest">View All</Link>
        </div>

        <div className="space-y-6">
          {recentTransactions.length === 0 ? (
            <p className="text-center text-gray-300 py-10 font-bold">取引履歴がありません</p>
          ) : (
            recentTransactions.map((tx) => {
              const dateObj = new Date(tx.occurred_on);
              const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
              const isExpense = tx.amount_yen < 0;
              const expenseType = getExpenseTypeBadge(tx.transaction_business_info);

              return (
                <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center gap-3 group">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95 shadow-sm",
                    !tx.transaction_business_info ? "bg-orange-50 text-orange-400" :
                      tx.transaction_business_info.is_business ? "bg-blue-50 text-blue-500" : "bg-gray-50 text-gray-400"
                  )}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {tx.transaction_business_info?.is_business ? <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> : <circle cx="12" cy="12" r="10" />}
                    </svg>
                  </div>
                  <span className="w-12 text-xs text-gray-400 font-black text-left shrink-0">{dateStr}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-gray-900 truncate tracking-tight min-w-0 flex-1">{tx.description}</h4>
                      <div className="flex-1 flex justify-center">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap",
                          expenseType.className
                        )}>
                          {expenseType.label}
                        </span>
                      </div>
                      <span className={cn(
                        "text-sm font-black tracking-tight shrink-0",
                        isExpense ? "text-gray-900" : "text-emerald-500"
                      )}>
                        {isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center mt-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">{tx.vendor_raw || "不明"}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
