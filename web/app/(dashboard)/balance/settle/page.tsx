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
};

export default function SettlePage() {
    const router = useRouter();
    const [liabilityAccounts, setLiabilityAccounts] = useState<Account[]>([]);
    const [settlementAccounts, setSettlementAccounts] = useState<Account[]>([]);

    const [liabilityId, setLiabilityId] = useState("");
    const [settlementId, setSettlementId] = useState("");
    const [amount, setAmount] = useState("");
    const [settledOn, setSettledOn] = useState(new Date().toISOString().split("T")[0]);
    const [note, setNote] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const liabilityAccount = liabilityAccounts.find((a) => a.id === liabilityId);
    const settlementAccount = settlementAccounts.find((a) => a.id === settlementId);

    useEffect(() => {
        async function fetchAccounts() {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from("accounts")
                    .select("*")
                    .eq("is_active", true)
                    .order("name");

                if (error) {
                    console.error("Error fetching accounts:", error);
                    return;
                }

                if (data) {
                    const accounts = data.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        asset_type: a.asset_type,
                        account_type: a.account_type || "asset",
                        current_balance_yen: a.opening_balance_yen || 0, // Fallback logic
                    })) as Account[];

                    // Filter accounts
                    setLiabilityAccounts(accounts.filter((a) => a.account_type === "liability"));

                    // Allow settlement from 'bank' or 'cash' (usually bank, but flexibility is good)
                    setSettlementAccounts(accounts.filter((a) => a.account_type === "asset"));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        void fetchAccounts();
    }, []);

    // Autofill amount if only liability is selected (optional UX improvement)
    useEffect(() => {
        if (liabilityAccount && !amount) {
            // If we had real-time balance logic here, we could pre-fill the outstanding amount.
            // For now, let's leave it blank or pre-fill with abs(balance) if negative.
            if (liabilityAccount.current_balance_yen < 0) {
                setAmount(String(Math.abs(liabilityAccount.current_balance_yen)));
            }
        }
    }, [liabilityAccount]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!liabilityId || !settlementId || !amount || !settledOn) {
            setError("すべての必須項目を入力してください");
            return;
        }

        if (liabilityId === settlementId) {
            setError("支払い元と支払先は異なる口座を選択してください");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insertError } = await (supabase as any)
                .from("card_settlements")
                .insert({
                    liability_account_id: liabilityId,
                    settlement_account_id: settlementId,
                    settled_on: settledOn,
                    amount_yen: parseInt(amount, 10),
                    note: note.trim() || null,
                });

            if (insertError) {
                throw insertError;
            }

            router.push("/balance");
        } catch (err) {
            console.error(err);
            setError("登録に失敗しました");
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
                <h1 className="text-xl font-black text-gray-900">カード引き落としを記録</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                {/* Liability Account Selection */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        引き落とされたカード（負債）
                    </label>
                    <select
                        value={liabilityId}
                        onChange={(e) => setLiabilityId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    >
                        <option value="">選択してください</option>
                        {liabilityAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} (現在: ¥{account.current_balance_yen.toLocaleString()})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Settlement Account Selection */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        出金元口座（資産）
                    </label>
                    <select
                        value={settlementId}
                        onChange={(e) => setSettlementId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    >
                        <option value="">選択してください</option>
                        {settlementAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} (現在: ¥{account.current_balance_yen.toLocaleString()})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        引き落とし金額
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            required
                            min="1"
                        />
                    </div>
                </div>

                {/* Date Input */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        引き落とし日
                    </label>
                    <input
                        type="date"
                        value={settledOn}
                        onChange={(e) => setSettledOn(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Note */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        備考（任意）
                    </label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="例: 1月分請求"
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
                    disabled={submitting || !liabilityId || !settlementId || !amount}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                    {submitting ? "保存中..." : "記録する"}
                </button>
            </form>
        </div>
    );
}
