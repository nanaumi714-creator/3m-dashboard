"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function TriagePage() {
  const [untriaged, setUntriaged] = useState<Transaction[]>([]);
  const [ratio, setRatio] = useState(100);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch unjudged transactions
  const fetchUntriaged = async () => {
    setLoading(true);
    try {
      // Find transactions where transaction_business_info is missing.
      // Easiest is to fetch transactions and LEFT JOIN, then filter.
      // Or select IDs from transaction_business_info and excluded them.
      // For now, simpler approach: fetch recent transactions and filter client side 
      // OR use RPC if we had one.
      // Let's rely on fetching recent 100 transactions and filtering for now 
      // as "Unjudged" should be recent.
      const { data, error } = await supabase
        .from("transactions")
        .select("*, transaction_business_info(transaction_id)")
        .order("amount_yen", { ascending: true }) // Large expenses first? Or date?
        .limit(200);

      if (error) throw error;

      // Filter those who have NO business info
      const unjudged = (data as any[]).filter(
        (tx) => !tx.transaction_business_info
      );

      setUntriaged(unjudged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUntriaged();
  }, []);

  const handleJudge = async (txId: string, isBusiness: boolean) => {
    try {
      const { error } = await supabase
        .from("transaction_business_info")
        .insert({
          transaction_id: txId,
          is_business: isBusiness,
          business_ratio: isBusiness ? ratio : 0, // 0 if personal
          audit_note: note,
          judged_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Remove from list
      setUntriaged((prev) => prev.filter((t) => t.id !== txId));

      // Reset inputs slightly? Keep ratio/note for batch?
      // Keeping them is better UX for batch processing same context.

    } catch (e) {
      console.error("Failed to judge", e);
      alert("保存に失敗しました");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <section>
      <div className="card">
        <h2>未判定キュー</h2>
        <p className="notice">
          未判定取引 ({untriaged.length}件) に対して事業判定と按分を記録します。
        </p>
      </div>

      <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
        <h3>判定設定 (共通)</h3>
        <div className="filters">
          <label>
            事業割合 (%)
            <input
              type="number"
              min={0}
              max={100}
              value={ratio}
              onChange={(event) => setRatio(Number(event.target.value))}
            />
          </label>
          <label>
            メモ
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="判定理由や備考"
            />
          </label>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>日付</th>
            <th>内容</th>
            <th>金額</th>
            <th>アクション</th>
          </tr>
        </thead>
        <tbody>
          {untriaged.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.occurred_on}</td>
              <td>{tx.description}</td>
              <td className="font-mono text-right">¥{tx.amount_yen.toLocaleString()}</td>
              <td>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="button bg-blue-600 text-white hover:bg-blue-700"
                    type="button"
                    onClick={() => handleJudge(tx.id, true)}
                  >
                    事業として記録 ({ratio}%)
                  </button>
                  <button
                    className="button bg-gray-200 text-gray-800 hover:bg-gray-300"
                    type="button"
                    onClick={() => handleJudge(tx.id, false)}
                  >
                    私用 (0%)
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {untriaged.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-8 text-gray-500">
                未判定の取引はありません 🎉
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

