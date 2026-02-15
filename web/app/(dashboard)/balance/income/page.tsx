"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tables, TablesInsert } from "@/lib/database.types";

type Account = Pick<Tables<"accounts">, "id" | "name" | "account_type" | "is_active">;

const defaultDate = new Date().toISOString().split("T")[0];

export default function BalanceIncomePage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [amountYen, setAmountYen] = useState("");
    const [occurredOn, setOccurredOn] = useState(defaultDate);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parsedAmount = useMemo(() => Number(amountYen), [amountYen]);

    useEffect(() => {
        async function fetchAccounts() {
            const { data, error: fetchError } = await supabase
                .from("accounts")
                .select("id, name, account_type, is_active")
                .eq("is_active", true)
                .eq("account_type", "asset")
                .order("name", { ascending: true });

            if (fetchError) {
                console.error("Failed to fetch accounts", fetchError);
                setError("口座一覧の取得に失敗しました");
                setLoading(false);
                return;
            }

            setAccounts(data ?? []);
            setLoading(false);
        }

        void fetchAccounts();
    }, []);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!selectedAccountId || !reason.trim()) {
            setError("口座と内容を入力してください");
            return;
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError("入金額は1円以上で入力してください");
            return;
        }

        setSubmitting(true);

        const payload: TablesInsert<"balance_adjustments"> = {
            account_id: selectedAccountId,
            adjusted_on: occurredOn,
            amount_yen: Math.trunc(parsedAmount),
            reason: `入金: ${reason.trim()}`,
        };

        const { error: insertError } = await supabase.from("balance_adjustments").insert(payload);

        if (insertError) {
            console.error("Failed to save income adjustment", insertError);
            setError("入金の保存に失敗しました");
            setSubmitting(false);
            return;
        }

        router.push("/balance");
        router.refresh();
    }

    if (loading) {
        return <div className="animate-pulse bg-white h-64 rounded-2xl border border-gray-100" />;
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 font-bold">
                    ← 戻る
                </button>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">口座への入金を登録</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">入金先口座</label>
                    <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
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

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">日付</label>
                    <input
                        type="date"
                        value={occurredOn}
                        onChange={(e) => setOccurredOn(e.target.value)}
                        className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">入金額 (JPY)</label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={amountYen}
                            onChange={(e) => setAmountYen(e.target.value)}
                            className="w-full border-none bg-gray-50 rounded-2xl pl-10 pr-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                            placeholder="300000"
                            required
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">給料・立替金返金など、残高が増える入金を記録します。</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">内容（必須）</label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        placeholder="例: 給与振込（2月分）"
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                        <p className="text-sm font-bold text-rose-600">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? "保存中..." : "入金を登録"}
                </button>
            </form>
        </div>
    );
}
