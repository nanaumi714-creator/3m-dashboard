"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Summary = {
  expenses: number;
  businessExpenses: number;
  untriaged: number;
  paymentMethodBreakdown: Record<string, number>;
};

type SummaryTransaction = {
  amount_yen: number;
  payment_methods: { name: string | null } | null;
  transaction_business_info: {
    is_business: boolean;
    business_ratio: number;
  } | null;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    expenses: 0,
    businessExpenses: 0,
    untriaged: 0,
    paymentMethodBreakdown: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      // Calculate start/end of current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Fetch all transactions for this month with related info
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          amount_yen,
          payment_methods(name),
          transaction_business_info(is_business, business_ratio)
        `)
        .gte("occurred_on", firstDay)
        .lte("occurred_on", lastDay);

      if (error) {
        console.error("Failed to fetch summary", error);
        setLoading(false);
        return;
      }

      // Client-side aggregation
      let expenses = 0;
      let businessExpenses = 0;
      let untriaged = 0;
      const paymentMethodBreakdown: Record<string, number> = {};

      (data as SummaryTransaction[] | null)?.forEach((tx) => {
        const amount = tx.amount_yen;

        // Breakdown
        const methodName = tx.payment_methods?.name || "Unknown";
        paymentMethodBreakdown[methodName] = (paymentMethodBreakdown[methodName] || 0) + amount;

        // Total Expenses (negative amounts)
        if (amount < 0) {
          expenses += amount;
        }

        // Business Logic
        if (!tx.transaction_business_info) {
          untriaged++;
        } else {
          const { is_business, business_ratio } = tx.transaction_business_info;
          if (is_business) {
            // Calculate business portion
            businessExpenses += Math.floor(amount * (business_ratio / 100));
          }
        }
      });

      setSummary({
        expenses,
        businessExpenses,
        untriaged,
        paymentMethodBreakdown,
      });
      setLoading(false);
    }

    fetchSummary();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <section>
      <div className="card-grid">
        <div className="card">
          <h3>今月の支出</h3>
          <p>¥{Math.abs(summary.expenses).toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>事業支出（按分後）</h3>
          <p>¥{Math.abs(summary.businessExpenses).toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>未判定</h3>
          <p>{summary.untriaged} 件</p>
        </div>
      </div>

      <div className="card mt-6">
        <h2>支払い手段別支出</h2>
        <ul>
          {Object.entries(summary.paymentMethodBreakdown).map(
            ([method, amount]) => (
              <li key={method}>
                {method}: ¥{Math.abs(amount).toLocaleString()}
              </li>
            )
          )}
        </ul>
      </div>

      <div className="card">
        <h2>今週のアクション</h2>
        <ul>
          <li>未判定取引をTriage Queueで判定する</li>
          <li>CSVをImporterに配置して半自動登録を試す</li>
        </ul>
      </div>
    </section>
  );
}
