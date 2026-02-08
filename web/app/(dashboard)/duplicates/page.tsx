"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

type DuplicateGroup = {
    fingerprint: string;
    transactions: Transaction[];
};

export default function DuplicatesPage() {
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDuplicates();
    }, []);

    async function loadDuplicates() {
        try {
            setLoading(true);

            // Find transactions with same fingerprint
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc("find_duplicate_transactions");

            if (error) throw error;

            // Group by fingerprint
            const groups: Record<string, Transaction[]> = {};
            (Array.isArray(data) ? data : []).forEach((tx: Transaction) => {
                if (!tx.fingerprint) return;
                if (!groups[tx.fingerprint]) {
                    groups[tx.fingerprint] = [];
                }
                groups[tx.fingerprint].push(tx);
            });

            const duplicateGroups = Object.entries(groups)
                .filter(([_, txs]) => txs.length > 1)
                .map(([fingerprint, transactions]) => ({ fingerprint, transactions }));

            setDuplicates(duplicateGroups);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleMerge(group: DuplicateGroup, keepId: string) {
        if (!confirm("選択した取引を残し、他を削除しますか？")) return;

        try {
            const toDelete = group.transactions
                .filter((tx) => tx.id !== keepId)
                .map((tx) => tx.id);

            const { error } = await supabase.from("transactions").delete().in("id", toDelete);

            if (error) throw error;

            alert("統合しました");
            loadDuplicates();
        } catch (err) {
            console.error(err);
            alert("統合に失敗しました");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">重複候補</h1>

                {duplicates.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="text-4xl mb-4">✨</div>
                        <p className="text-gray-600">重複候補はありません</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {duplicates.map((group) => (
                            <div key={group.fingerprint} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-500 mb-4">
                                    Fingerprint: {group.fingerprint.substring(0, 16)}...
                                </h3>

                                <div className="space-y-3">
                                    {group.transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{tx.description}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {tx.occurred_on} • ¥{tx.amount_yen.toLocaleString()}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleMerge(group, tx.id)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                これを残す
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
