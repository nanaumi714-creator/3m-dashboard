"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Account = {
    id: string;
    name: string;
    asset_type: string;
    account_type: string;
    current_balance_yen: number;
};

type CardSettlement = {
    id: string;
    liability_account: { name: string };
    amount_yen: number;
    settled_on: string;
};

type Summary = {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
};

export default function BalancePage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
    const [upcomingSettlements, setUpcomingSettlements] = useState<CardSettlement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: accountsData, error } = await (supabase as any)
                .from("account_balances") // Use view
                .select("*");

            if (error) {
                // Fallback if view doesn't exist yet (for dev robustness)
                console.warn("View not ready, falling back to basic table", error);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: fallbackData } = await (supabase as any).from("accounts").select("*");
                if (fallbackData) {
                    const mapped = fallbackData.map((a: any) => ({
                        ...a,
                        account_type: a.account_type || "asset",
                        current_balance_yen: a.opening_balance_yen || 0,
                    }));
                    setAccounts(mapped);
                    calculateSummary(mapped);
                }
                setLoading(false);
                return;
            }

            if (accountsData) {
                const mapped = accountsData.map((a: any) => ({
                    ...a,
                    account_type: a.account_type || "asset",
                })) as Account[];
                setAccounts(mapped);
                calculateSummary(mapped);
            }

            // Fetch settlements (mock or real)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: settlements } = await (supabase as any)
                .from("card_settlements")
                .select("*, liability_account:liability_account_id(name)")
                .gte("settled_on", new Date().toISOString().split("T")[0])
                .order("settled_on")
                .limit(3);

            if (settlements) {
                setUpcomingSettlements(settlements);
            }

            setLoading(false);
        }

        void fetchData();
    }, []);

    function calculateSummary(accs: Account[]) {
        let assets = 0;
        let liabilities = 0;

        accs.forEach(a => {
            if (a.account_type === "liability") {
                liabilities += a.current_balance_yen; // Usually negative
            } else {
                assets += a.current_balance_yen;
            }
        });

        setSummary({
            totalAssets: assets,
            totalLiabilities: liabilities,
            netWorth: assets + liabilities
        });
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse bg-white h-48 rounded-2xl border border-gray-100" />
                <div className="animate-pulse bg-white h-64 rounded-2xl border border-gray-100" />
            </div>
        );
    }

    const assets = accounts.filter(a => a.account_type === "asset");
    const liabilities = accounts.filter(a => a.account_type === "liability");

    return (
        <div className="space-y-6">
            {/* Total Wealth Card */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-[24px] p-6 text-slate-900 border border-slate-200 shadow-sm">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-500">純資産総額</p>
                <p className="text-4xl font-black mt-2 tracking-tight text-slate-800">
                    ¥{summary.netWorth.toLocaleString()}
                    <span className="text-sm font-bold ml-2 text-slate-400">JPY</span>
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                        <p className="text-xs text-slate-400 opacity-70">資産合計</p>
                        <p className="text-lg font-bold text-emerald-600">¥{summary.totalAssets.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 opacity-70">負債合計</p>
                        <p className={`text-lg font-bold ${summary.totalLiabilities < 0 ? "text-rose-500" : "text-slate-600"}`}>
                            ¥{Math.abs(summary.totalLiabilities).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
                <Link href="/balance/adjust" className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all">
                    <span className="text-2xl mb-1">⚖️</span>
                    <span className="text-[10px] font-bold text-slate-600">残高調整</span>
                </Link>
                <Link href="/balance/settle" className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all">
                    <span className="text-2xl mb-1">💳</span>
                    <span className="text-[10px] font-bold text-slate-600">カード精算</span>
                </Link>
                <Link href="/transfers" className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all">
                    <span className="text-2xl mb-1">💸</span>
                    <span className="text-[10px] font-bold text-slate-600">資金移動</span>
                </Link>
            </div>

            {/* Assets List */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">資産 ({assets.length})</h2>
                    <Link href="/accounts" className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                        編集
                    </Link>
                </div>
                <div className="space-y-4">
                    {assets.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center text-lg group-hover:bg-white group-hover:text-slate-600 transition-colors shadow-sm">
                                    {account.asset_type === 'bank' ? '🏦' : account.asset_type === 'cash' ? '👛' : '📱'}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">{account.name}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase">{account.asset_type}</p>
                                </div>
                            </div>
                            <p className="font-bold text-slate-800">¥{account.current_balance_yen.toLocaleString()}</p>
                        </div>
                    ))}
                    {assets.length === 0 && <p className="text-center text-gray-400 text-sm py-4">口座が登録されていません</p>}
                </div>
            </div>

            {/* Liabilities List */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-4">負債・クレジットカード</h2>
                <div className="space-y-4">
                    {liabilities.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-lg group-hover:bg-white group-hover:text-rose-600 transition-colors shadow-sm">
                                    💳
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">{account.name}</p>
                                    <p className="text-xs text-rose-400 font-bold">引き落とし待ち</p>
                                </div>
                            </div>
                            <p className="font-bold text-rose-600">¥{Math.abs(account.current_balance_yen).toLocaleString()}</p>
                        </div>
                    ))}
                    {liabilities.length === 0 && <p className="text-center text-gray-400 text-sm py-4">負債口座はありません</p>}
                </div>
            </div>

            {/* Upcoming Settlements */}
            {upcomingSettlements.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">直近の引き落とし予定</p>
                    <div className="space-y-3">
                        {upcomingSettlements.map(s => (
                            <div key={s.id} className="flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-600">{s.settled_on.split('-').slice(1).join('/')}</span>
                                <span className="text-slate-500">{s.liability_account?.name || 'カード'}</span>
                                <span className="font-bold text-slate-700">¥{s.amount_yen.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
