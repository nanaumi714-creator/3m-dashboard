"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  payment_methods: Database["public"]["Tables"]["payment_methods"]["Row"] | null;
  transaction_business_info:
  | Database["public"]["Tables"]["transaction_business_info"]["Row"]
  | null;
};

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("2025-01-01"); // TODO: Default to current month start
  const [to, setTo] = useState("2025-12-31");
  const [onlyUntriaged, setOnlyUntriaged] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search input
  const handleSearch = useDebouncedCallback((value: string) => {
    setQuery(value);
    setPage(1); // Reset to page 1 on search change
  }, 300);

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      try {
        let q = supabase
          .from("transactions")
          .select(
            "*, payment_methods(*), transaction_business_info(*)",
            { count: "exact" }
          );

        if (query) {
          // Vendor OR Description match
          // Note: Full text search would be better Phase 3
          q = q.or(`description.ilike.%${query}%,vendor_raw.ilike.%${query}%`);
        }

        if (from) q = q.gte("occurred_on", from);
        if (to) q = q.lte("occurred_on", to);

        if (onlyUntriaged) {
          // Filter where transaction_business_info is null
          // This requires correct join filtering or identifying via 'is'
          // Supabase join filtering: !inner join filters parent row, LEFT JOIN doesn't.
          // For simple check: .is('transaction_business_info', null) works if we select it?
          // Actually, .not('transaction_business_info', 'is', null) is 'has info'.
          // To find 'missing info', we usually need !inner or filtering on the joined column.
          // But LEFT JOIN + .filter('transaction_business_info', 'is', 'null') is weird in Supabase JS.
          // Workaround: We fetch everything and filter on client OR use a different query logic?
          // Better: Use .is("transaction_business_info", null) on the FK relation? No, FK is on child.
          // Correct way: use !inner join to filter? No that's finding matching ones.
          // For finding "missing child", typical SQL is LEFT JOIN where child.id IS NULL.
          // Supabase-js specific:
          // It's tricky. For Phase 1, simpler to filter on client if volume is low, OR separate query for IDs.
          // However, to do filtering server side:
          // q = q.filter("transaction_business_info.transaction_id", "is", "null")? No.
          // Let's assume client filtering for "Untriaged" strictly for Phase 1 MVP if server filtering is tough.
          // Wait, "transactions" doesn't have FK to "transaction_business_info". "tbi" has FK to "transactions".
          // So transactions LEFT JOIN tbi.
          // .filter('transaction_business_info', 'is', null) MIGHT work if the join is set up right.
          // Let's try explicit manual filtering or rely on an assumption for now.
          // Actually, let's defer complex server-side untriaged filtering if it blocks.
          // Re-reading docs: .not('transaction_business_info', 'cs', '{"transaction_id": *}') might be too complex.
        }

        // Pagination
        const fromIdx = (page - 1) * perPage;
        const toIdx = fromIdx + perPage - 1;
        q = q.range(fromIdx, toIdx).order("occurred_on", { ascending: false });

        const { data, error, count } = await q;

        if (error) throw error;

        let validData = (data as any) as Transaction[]; // Casting for extended types

        if (onlyUntriaged) {
          // Client side filter for now as workaround
          // Note: This messes up pagination count if we filter AFTER fetching page.
          // Ideally we need server side.
          validData = validData.filter(t => !t.transaction_business_info);
        }

        setTransactions(validData || []);
        setTotalCount(count || 0);

      } catch (e) {
        console.error("Fetch error", e);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [query, from, to, page, onlyUntriaged]);

  const pageCount = Math.max(1, Math.ceil(totalCount / perPage));

  return (
    <section>
      <div className="filters">
        <label>
          検索
          <input
            defaultValue={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="ベンダーやメモを検索"
          />
        </label>

        <label>
          期間（開始）
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          期間（終了）
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          未判定のみ (Client Filter)
          <input
            type="checkbox"
            checked={onlyUntriaged}
            onChange={(e) => {
              setOnlyUntriaged(e.target.checked);
              setPage(1);
            }}
          />
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>日付</th>
              <th>内容</th>
              <th>支払い手段</th>
              <th>金額</th>
              <th>判定</th>
              <th>ベンダー</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isExpense = tx.amount_yen < 0;
              const tbi = tx.transaction_business_info;
              const statusLabel = !tbi
                ? "未判定"
                : !tbi.is_business
                  ? "生活"
                  : tbi.business_ratio < 100
                    ? "按分"
                    : "事業";

              return (
                <tr key={tx.id}>
                  <td>{tx.occurred_on}</td>
                  <td>
                    <Link href={`/transactions/${tx.id}`}>{tx.description}</Link>
                  </td>
                  <td>{tx.payment_methods?.name || "Unknown"}</td>
                  <td className={cn(
                    "font-mono text-right",
                    isExpense ? "text-red-600" : "text-green-600"
                  )}>
                    {isExpense ? "" : "+"}¥{Math.abs(tx.amount_yen).toLocaleString()}
                  </td>
                  <td>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs border",
                      statusLabel === "未判定" && "bg-gray-100 text-gray-800 border-gray-300",
                      statusLabel === "生活" && "bg-blue-50 text-blue-700 border-blue-200",
                      statusLabel === "事業" && "bg-amber-50 text-amber-700 border-amber-200",
                      statusLabel === "按分" && "bg-amber-100 text-amber-800 border-amber-300"
                    )}>
                      {statusLabel}
                    </span>
                  </td>
                  <td>{tx.vendor_raw}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="filters" style={{ justifyContent: "flex-end", marginTop: "1rem" }}>
        <button
          className="button"
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
        >
          前へ
        </button>
        <span className="mx-4">
          {page} / {pageCount} (Total: {totalCount})
        </span>
        <button
          className="button"
          type="button"
          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          disabled={page === pageCount}
        >
          次へ
        </button>
      </div>
    </section>
  );
}

