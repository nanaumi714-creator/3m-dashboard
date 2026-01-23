"use client";

import { useMemo, useState } from "react";
import { transactions } from "../lib/mock-data";

export default function TriagePage() {
  const [ratio, setRatio] = useState(100);
  const [note, setNote] = useState("");

  const untriaged = useMemo(
    () => transactions.filter((tx) => tx.isBusiness === undefined),
    []
  );

  return (
    <section>
      <div className="card">
        <h2>未判定キュー</h2>
        <p className="notice">
          未判定取引に対して事業判定と按分を記録します。
        </p>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>日付</th>
            <th>内容</th>
            <th>金額</th>
            <th>判定</th>
          </tr>
        </thead>
        <tbody>
          {untriaged.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.occurredOn}</td>
              <td>{tx.description}</td>
              <td>¥{tx.amountYen.toLocaleString()}</td>
              <td>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="button" type="button">
                    事業
                  </button>
                  <button className="button" type="button">
                    私用
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>判定内容</h3>
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
        <p className="notice">入力は次のAPI連携で保存予定です。</p>
      </div>
    </section>
  );
}
