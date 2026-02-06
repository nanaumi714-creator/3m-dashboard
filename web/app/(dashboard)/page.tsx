"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Summary = {
  totalMonthly: number;
  businessMonthly: number;
  privateMonthly: number;
  untriagedCount: number;
  totalLifetime: number;
  availableAssets: number;
  unpaidLiabilities: number;
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
  } | null;
};

function getExpenseTypeBadge(tbi: Transaction["transaction_business_info"]): {
  label: string;
  className: string;
} {
  if (!tbi) return { label: "未判定", className: "bg-gray-100 text-gray-800" };
  if (!tbi.is_business) return { label: "プライベート", className: "bg-purple-100 text-purple-800" };
  if ((tbi.business_ratio ?? 100) < 100) return { label: `按分 ${tbi.business_ratio ?? 0}%`, className: "bg-blue-100 text-blue-800" };
  return { label: "事業用", className: "bg-blue-600 text-white" };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    totalMonthly: 0,
    businessMonthly: 0,
    privateMonthly: 0,
    untriagedCount: 0,
    totalLifetime: 0,
    availableAssets: 0,
    unpaidLiabilities: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      try {
        const [monthlyRes, lifetimeRes, recentRes, accountsRes, transfersRes, txRes, methodRes] = await Promise.all([
          supabase.from("transactions").select("amount_yen, transaction_business_info(is_business, business_ratio)").gte("occurred_on", firstDay).lte("occurred_on", lastDay),
          supabase.from("transactions").select("amount_yen"),
          supabase.from("transactions").select("id, occurred_on, amount_yen, description, vendor_raw, payment_methods(name), transaction_business_info(is_business, business_ratio)").order("occurred_on", { ascending: false }).limit(5)
        ]);

        let mTotal = 0;
        let mBiz = 0;
        let mPriv = 0;
        let mUntriaged = 0;

        (monthlyRes.data || []).forEach((tx) => {
          const amount = tx.amount_yen;
          if (amount >= 0) return;
          mTotal += amount;

          const info = Array.isArray(tx.transaction_business_info) ? tx.transaction_business_info[0] : tx.transaction_business_info;
          if (!info) {
            mUntriaged += 1;
            mPriv += amount;
            return;
          }

          if (info.is_business) {
            const bPart = Math.floor(amount * (info.business_ratio / 100));
            mBiz += bPart;
            mPriv += amount - bPart;
            return;
          }
          mPriv += amount;
        });

        let lTotal = 0;
        (lifetimeRes.data || []).forEach((tx) => {
          if (tx.amount_yen < 0) lTotal += tx.amount_yen;
        });

        const assetSummary = calculateAssetSummary(
          (accountsRes.data || []) as AccountRow[],
          (transfersRes.data || []) as TransferRow[],
          (txRes.data || []) as TxForBalance[],
          (methodRes.data || []) as PaymentMethodForBalance[],
        );

        setSummary({
          totalMonthly: mTotal,
          businessMonthly: mBiz,
          privateMonthly: mPriv,
          untriagedCount: mUntriaged,
          totalLifetime: lTotal,
          availableAssets: assetSummary.availableAssets,
          unpaidLiabilities: assetSummary.unpaidLiabilities,
        });
        setRecentTransactions((recentRes.data || []) as Transaction[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-white h-52 rounded-[32px] border border-gray-100" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-blue-600 tracking-widest uppercase">総資産（即時利用可能分）</p>
          <p className="text-3xl font-black text-gray-900 mt-2">¥{summary.availableAssets.toLocaleString()}</p>
          <p className="text-xs font-medium text-gray-500 mt-2">初期残高 + 即時決済の収支 + 振替反映</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-purple-700 tracking-widest uppercase">未払金（カード利用分）</p>
          <p className="text-3xl font-black text-gray-900 mt-2">¥{summary.unpaidLiabilities.toLocaleString()}</p>
          <p className="text-xs font-medium text-gray-500 mt-2">翌月引き落としの支出を集計</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] p-4 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Total Lifetime Expenses</span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-gray-900 tracking-tighter">¥{Math.abs(summary.totalLifetime).toLocaleString()}</span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">JPY</span>
        </div>
      </div>

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
              return (
                <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center gap-3 group">
                  <span className="w-12 text-xs text-gray-400 font-black text-left shrink-0">{dateStr}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-gray-900 truncate tracking-tight min-w-0 flex-1">{tx.description}</h4>
                      <span className={`text-sm font-black tracking-tight shrink-0 ${isExpense ? "text-gray-900" : "text-emerald-500"}`}>{isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}</span>
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
