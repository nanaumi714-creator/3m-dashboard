"use client";

import { useMemo, useState } from "react";
import { paymentMethods, transactions } from "../lib/mock-data";

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("All");
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-01-31");
  const [onlyUntriaged, setOnlyUntriaged] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesQuery =
        tx.description.toLowerCase().includes(query.toLowerCase()) ||
        tx.vendor.toLowerCase().includes(query.toLowerCase());
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
          </tr>
        </thead>
        <tbody>
          {filtered.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.occurredOn}</td>
              <td>{tx.description}</td>
              <td>{tx.paymentMethod}</td>
              <td>¥{tx.amountYen.toLocaleString()}</td>
              <td>
                {tx.isBusiness === undefined ? (
                  <span className="badge">未判定</span>
                ) : tx.isBusiness ? (
                  "事業"
                ) : (
                  "私用"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
