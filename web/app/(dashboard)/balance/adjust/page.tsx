"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Account = {
    id: string;
    name: string;
    asset_type: string;
    account_type: string;
    current_balance_yen: number;
    is_active: boolean;
};

export default function BalanceAdjustPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [actualBalance, setActualBalance] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const adjustment = selectedAccount
        ? parseInt(actualBalance || "0", 10) - (selectedAccount.current_balance_yen || 0)
        : 0;

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const { data, error } = await supabase
                    .from("account_balances")
                    .select("id,name,asset_type,account_type,current_balance_yen,is_active")
                    .eq("is_active", true)
                    .order("name");

                if (error) {
                    console.error("Error fetching accounts:", error);
                    return;
                }

                if (data) {
                    const mapped = data
                        .filter((a): a is NonNullable<typeof a> => a !== null)
                        .map((a) => ({
                            id: a.id ?? "",
                            name: a.name ?? "",
                            asset_type: a.asset_type ?? "",
                            account_type: a.account_type ?? "asset",
                            current_balance_yen: a.current_balance_yen ?? 0,
                            is_active: a.is_active ?? true,
                        }))
                        .filter((a) => a.id && a.name);

                    setAccounts(mapped);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        void fetchAccounts();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!selectedAccountId || !reason.trim()) {
            setError("口座と理由を入力してください");
            return;
        }

        if (adjustment === 0) {
            setError("調整額が0です");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase as any)
                .from("balance_adjustments")
                .insert({
                    account_id: selectedAccountId,
                    adjusted_on: new Date().toISOString().split("T")[0],
                    amount_yen: adjustment,
                    reason: reason.trim(),
                });

            if (insertError) {
                throw insertError;
            }

            router.push("/balance");
        } catch (err) {
            console.error(err);
            setError("調整の保存に失敗しました");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse bg-white h-64 rounded-2xl border border-gray-100" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ← 戻る
                </button>
                <h1 className="text-xl font-black text-gray-900">残高を調整</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                {/* Account Selection */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        対象口座
                    </label>
                    <select
                        value={selectedAccountId}
                        onChange={(e) => {
                            setSelectedAccountId(e.target.value);
                            setActualBalance("");
                        }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    >
                        <option value="">選択してください</option>
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Current Balance (read-only) */}
                {selectedAccount && (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            現在の計算残高
                        </label>
                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 font-mono">
                            ¥{(selectedAccount.current_balance_yen || 0).toLocaleString()}
                        </div>
                    </div>
                )}

                {/* Actual Balance Input */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        実際の残高（この値に合わせます）
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                        <input
                            type="number"
                            value={actualBalance}
                            onChange={(e) => setActualBalance(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            required
                        />
                    </div>
                </div>

                {/* Adjustment Preview */}
                {selectedAccount && actualBalance !== "" && (
                    <div className={`p-4 rounded-xl ${adjustment >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                        <p className="text-sm font-bold text-gray-700">調整額</p>
                        <p className={`text-2xl font-black ${adjustment >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {adjustment >= 0 ? "+" : ""}¥{adjustment.toLocaleString()}
                        </p>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        理由（必須）
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="例: 財布の現金を数えたら差額があった"
                        required
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm font-bold text-red-600">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting || !selectedAccountId || !reason.trim() || adjustment === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                    {submitting ? "保存中..." : "調整を確定"}
                </button>
            </form>
        </div>
    );
}
