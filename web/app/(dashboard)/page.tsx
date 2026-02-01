"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Summary = {
  totalExpenses: number;
  businessExpenses: number;
  privateExpenses: number;
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
    totalExpenses: 0,
    businessExpenses: 0,
    privateExpenses: 0,
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
      let totalExpenses = 0;
      let businessExpenses = 0;
      let privateExpenses = 0;
      let untriaged = 0;
      const paymentMethodBreakdown: Record<string, number> = {};

      (data as SummaryTransaction[] | null)?.forEach((tx) => {
        const amount = tx.amount_yen;
        if (amount >= 0) return; // Only count expenses (negative amounts)

        totalExpenses += amount;

        // Breakdown
        const methodName = tx.payment_methods?.name || "未設定";
        paymentMethodBreakdown[methodName] = (paymentMethodBreakdown[methodName] || 0) + amount;

        // Business Logic
        if (!tx.transaction_business_info) {
          untriaged++;
          // For untriaged items, assume they are fully private for now, but flagged separately.
          privateExpenses += amount;
        } else {
          const { is_business, business_ratio } = tx.transaction_business_info;
          if (is_business) {
            // Calculate business portion
            const bPart = Math.floor(amount * (business_ratio / 100));
            businessExpenses += bPart;
            privateExpenses += (amount - bPart); // The remainder is private
          } else {
            // If not a business transaction, it's fully private
            privateExpenses += amount;
          }
        }
      });

      setSummary({
        totalExpenses,
        businessExpenses,
        privateExpenses,
        untriaged,
        paymentMethodBreakdown,
      });
      setLoading(false);
    }

    fetchSummary();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-1">今月の総支出</h3>
          <p className="text-3xl font-bold text-gray-900">¥{Math.abs(summary.totalExpenses).toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <h3 className="text-sm font-medium text-blue-700 mb-1">事業経費（按分後）</h3>
          <p className="text-3xl font-bold text-blue-900">¥{Math.abs(summary.businessExpenses).toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
          <h3 className="text-sm font-medium text-purple-700 mb-1">プライベート支出</h3>
          <p className="text-3xl font-bold text-purple-900">¥{Math.abs(summary.privateExpenses).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">未判定の取引</h3>
          <p className={`text-3xl font-bold ${summary.untriaged > 0 ? "text-orange-500" : "text-gray-900"}`}>
            {summary.untriaged} <span className="text-lg font-normal text-gray-500">件</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            支払い手段別支出
          </h2>
          <div className="space-y-3">
            {Object.entries(summary.paymentMethodBreakdown).map(
              ([method, amount]) => (
                <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <span className="font-medium text-gray-700">{method}</span>
                  <span className="font-bold text-gray-900">¥{Math.abs(amount).toLocaleString()}</span>
                </div>
              )
            )}
            {Object.keys(summary.paymentMethodBreakdown).length === 0 && (
              <p className="text-center text-gray-400 py-4">データがありません</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
            今週のアクション
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                🔍
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">未判定取引の整理</h4>
                <p className="text-sm text-gray-600">
                  {summary.untriaged}件の未判定取引があります。Triage Queueで判定を完了させましょう。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                📄
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">CSVインポートの実行</h4>
                <p className="text-sm text-gray-600">
                  今週分の銀行明細やカード明細をインポートして、入力を自動化しましょう。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
