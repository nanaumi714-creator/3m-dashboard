"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Summary = {
    totalMonthly: number;
    businessMonthly: number;
    privateMonthly: number;
    untriagedCount: number;
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
    if (!tbi) return { label: "未判定", className: "bg-gray-50 text-gray-500 border border-gray-100" };
    if (!tbi.is_business) return { label: "プライベート", className: "bg-purple-50 text-purple-600 border border-purple-100" };
    if ((tbi.business_ratio ?? 100) < 100) return { label: `按分 ${tbi.business_ratio ?? 0}%`, className: "bg-teal-50 text-teal-600 border border-teal-100" };
    return { label: "事業用", className: "bg-sky-50 text-sky-600 border border-sky-100" };
}

export default function ExpensesPage() {
    const [summary, setSummary] = useState<Summary>({
        totalMonthly: 0,
        businessMonthly: 0,
        privateMonthly: 0,
        untriagedCount: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState("");
    const [viewMode, setViewMode] = useState<"business" | "private">("business");

    useEffect(() => {
        async function fetchData() {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

            setCurrentMonth(`${now.getFullYear()}年${now.getMonth() + 1}月`);

            try {
                // Lifetime fetch removed
                const [monthlyRes, recentRes] = await Promise.all([
                    supabase
                        .from("transactions")
                        .select("amount_yen, transaction_business_info(is_business, business_ratio)")
                        .gte("occurred_on", firstDay)
                        .lte("occurred_on", lastDay),
                    supabase
                        .from("transactions")
                        .select("id, occurred_on, amount_yen, description, vendor_raw, payment_methods(name), transaction_business_info(is_business, business_ratio)")
                        .order("occurred_on", { ascending: false })
                        .limit(5),
                ]);

                let mTotal = 0;
                let mBiz = 0;
                let mPriv = 0;
                let mUntriaged = 0;

                (monthlyRes.data || []).forEach((tx) => {
                    const amount = tx.amount_yen;
                    if (amount >= 0) return; // Only expenses
                    mTotal += amount;

                    const info = Array.isArray(tx.transaction_business_info)
                        ? tx.transaction_business_info[0]
                        : tx.transaction_business_info;

                    if (!info) {
                        mUntriaged += 1;
                        mPriv += amount; // Defaults to private if untriaged for calculation safety
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

                setSummary({
                    totalMonthly: mTotal,
                    businessMonthly: mBiz,
                    privateMonthly: mPriv,
                    untriagedCount: mUntriaged,
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
        return (
            <div className="space-y-4">
                <div className="animate-pulse bg-white h-40 rounded-2xl border border-gray-100" />
                <div className="animate-pulse bg-white h-20 rounded-2xl border border-gray-100" />
                <div className="animate-pulse bg-white h-64 rounded-2xl border border-gray-100" />
            </div>
        );
    }

    const businessRatio = summary.totalMonthly !== 0
        ? Math.round((Math.abs(summary.businessMonthly) / Math.abs(summary.totalMonthly)) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Summary Card */}
            <div
                onClick={() => setViewMode(prev => prev === "business" ? "private" : "business")}
                className={`rounded-[24px] p-6 shadow-sm border cursor-pointer transition-all active:scale-[0.98] select-none ${viewMode === "business"
                        ? "bg-gradient-to-br from-sky-50 to-white border-sky-100 text-sky-900"
                        : "bg-gradient-to-br from-purple-50 to-white border-purple-100 text-purple-900"
                    }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${viewMode === "business" ? "text-sky-400" : "text-purple-400"}`}>
                        {currentMonth}の{viewMode === "business" ? "事業経費" : "プライベート支出"}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${viewMode === "business" ? "bg-sky-100 text-sky-600" : "bg-purple-100 text-purple-600"}`}>切替可能</span>
                    </p>
                </div>
                <p className="text-4xl font-black mt-0 tracking-tight">
                    ¥{Math.abs(viewMode === "business" ? summary.businessMonthly : summary.privateMonthly).toLocaleString()}
                    <span className="text-sm font-bold ml-2 opacity-50">JPY</span>
                </p>
                <div className="flex gap-8 mt-4">
                    <div>
                        <p className="text-xs opacity-50">準備状況</p>
                        <p className="text-sm font-bold">
                            {summary.untriagedCount === 0 ? "✨ 整理済み" : `⚠️ 未判定 ${summary.untriagedCount}件`}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs opacity-50">{viewMode === "business" ? "経費率" : "家計率"}</p>
                        <p className="text-sm font-bold">
                            {viewMode === "business" ? businessRatio : (100 - businessRatio)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">今月の支出</p>
                    <p className="text-2xl font-black text-slate-700 mt-2">
                        ¥{Math.abs(summary.totalMonthly).toLocaleString()}
                    </p>
                </div>
                <Link
                    href="/triage"
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-sky-200 hover:shadow-md transition-all"
                >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">未判定件数</p>
                    <p className="text-2xl font-black text-slate-700 mt-2">
                        {summary.untriagedCount}
                        <span className="text-sm font-bold text-gray-400 ml-1">件</span>
                    </p>
                </Link>
            </div>

            {/* Recent Expenses */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">最近の支出</h2>
                    <Link
                        href="/transactions"
                        className="text-xs font-bold text-sky-500 px-3 py-1.5 bg-sky-50 rounded-xl uppercase tracking-widest hover:bg-sky-100 transition-colors"
                    >
                        View All
                    </Link>
                </div>

                <div className="space-y-4">
                    {recentTransactions.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 font-bold">
                            取引履歴がありません
                        </p>
                    ) : (
                        recentTransactions.map((tx) => {
                            const dateObj = new Date(tx.occurred_on);
                            const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                            const isExpense = tx.amount_yen < 0;
                            const badge = getExpenseTypeBadge(
                                Array.isArray(tx.transaction_business_info)
                                    ? tx.transaction_business_info[0]
                                    : tx.transaction_business_info
                            );
                            return (
                                <Link
                                    key={tx.id}
                                    href={`/transactions/${tx.id}`}
                                    className="flex items-center gap-3 group"
                                >
                                    <span className="w-12 text-xs text-slate-400 font-bold text-left shrink-0">
                                        {dateStr}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-700 truncate tracking-tight min-w-0 flex-1">
                                                {tx.description}
                                            </h4>
                                            <span
                                                className={`text-sm font-bold tracking-tight shrink-0 ${isExpense ? "text-slate-700" : "text-teal-500"
                                                    }`}
                                            >
                                                {isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                                {tx.vendor_raw || "不明"}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                                                {badge.label}
                                            </span>
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
