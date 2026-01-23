"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { paymentMethods, transactions } from "../lib/mock-data";

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("All");
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-01-31");
  const [onlyUntriaged, setOnlyUntriaged] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesQuery =
        tx.description.toLowerCase().includes(query.toLowerCase()) ||
        tx.vendorRaw.toLowerCase().includes(query.toLowerCase());
      const matchesMethod = method === "All" || tx.paymentMethod === method;
      const matchesFrom = from ? tx.occurredOn >= from : true;
      const matchesTo = to ? tx.occurredOn <= to : true;
      const matchesUntriaged = onlyUntriaged
        ? tx.isBusiness === undefined
        : true;

      return (
        matchesQuery && matchesMethod && matchesFrom && matchesTo && matchesUntriaged
      );
    });
  }, [query, method, from, to, onlyUntriaged]);

  useEffect(() => {
    setPage(1);
  }, [query, method, from, to, onlyUntriaged]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <section>
      <div className="filters">
        <label>
          検索
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ベンダーやメモを検索"
          />
        </label>
        <label>
          支払い手段
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            {paymentMethods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          期間（開始）
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          期間（終了）
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label>
          未判定のみ
          <input
            type="checkbox"
            checked={onlyUntriaged}
            onChange={(event) => setOnlyUntriaged(event.target.checked)}
          />
        </label>
      </div>

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
          {pageItems.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.occurredOn}</td>
              <td>
                <Link href={`/transactions/${tx.id}`}>{tx.description}</Link>
              </td>
              <td>{tx.paymentMethod}</td>
              <td>¥{tx.amountYen.toLocaleString()}</td>
              <td>
                {tx.isBusiness === undefined ? (
                  <span className="badge">未判定</span>
                ) : tx.isBusiness && (tx.businessRatio ?? 100) < 100 ? (
                  "按分"
                ) : tx.isBusiness ? (
                  "事業"
                ) : (
                  "生活"
                )}
              </td>
              <td>{tx.vendorRaw}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="filters" style={{ justifyContent: "flex-end" }}>
        <button
          className="button"
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
        >
          前へ
        </button>
        <span>
          {page} / {pageCount}
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
