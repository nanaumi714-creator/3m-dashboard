"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SwipeableItem from "../components/SwipeableItem";

type Transaction = {
    id: string;
    occurred_on: string;
    description: string;
    amount_yen: number;
};

export default function MobileTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, []);

    async function loadTransactions() {
        try {
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .order("occurred_on", { ascending: false })
                .limit(50);

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("この取引を削除しますか？")) return;

        try {
            const { error } = await supabase
                .from("transactions")
                .delete()
                .eq("id", id);

            if (error) throw error;
            setTransactions(transactions.filter((t) => t.id !== id));
        } catch (err) {
            console.error(err);
            alert("削除に失敗しました");
        }
    }

    function handleEdit(id: string) {
        window.location.href = `/transactions/${id}/edit`;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="container-mobile py-6">
                <h1 className="text-2xl font-bold mb-6">取引一覧</h1>

                <div className="space-y-2">
                    {transactions.map((transaction) => (
                        <SwipeableItem
                            key={transaction.id}
                            onSwipeLeft={() => handleDelete(transaction.id)}
                            onSwipeRight={() => handleEdit(transaction.id)}
                            leftAction={
                                <span className="font-medium">編集</span>
                            }
                            rightAction={
                                <span className="font-medium">削除</span>
                            }
                        >
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <div className="text-sm text-gray-500">
                                            {new Date(transaction.occurred_on).toLocaleDateString("ja-JP")}
                                        </div>
                                        <div className="font-medium text-gray-900 mt-1">
                                            {transaction.description}
                                        </div>
                                    </div>
                                    <div className={`text-lg font-bold ${transaction.amount_yen < 0 ? "text-red-600" : "text-gray-900"
                                        }`}>
                                        ¥{transaction.amount_yen.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </SwipeableItem>
                    ))}
                </div>

                {transactions.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">取引がありません</p>
                    </div>
                )}

                <div className="mt-6 text-center text-sm text-gray-500">
                    ← スワイプで編集 / スワイプ → で削除
                </div>
            </div>
        </div>
    );
}
