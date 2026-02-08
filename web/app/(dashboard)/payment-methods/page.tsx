"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentMethod = any;

type SettlementTiming = "immediate" | "next_month";
type PaymentType = "cash" | "bank" | "qr" | "emoney" | "credit" | "other";

const typeOptions: { value: PaymentType; label: string }[] = [
  { value: "cash", label: "現金" },
  { value: "bank", label: "銀行振込" },
  { value: "qr", label: "QR決済" },
  { value: "emoney", label: "電子マネー" },
  { value: "credit", label: "カード" },
  { value: "other", label: "その他" },
];

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState<PaymentMethod[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentType>("other");
  const [timing, setTiming] = useState<SettlementTiming>("immediate");
  const [status, setStatus] = useState<string | null>(null);

  const loadRows = async () => {
    const { data, error } = await supabase.from("payment_methods").select("*").order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setStatus("支払方法の取得に失敗しました。");
      return;
    }
    setRows(data || []);
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim()) {
      setStatus("名称を入力してください。");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("payment_methods").insert({
      name: name.trim(),
      type,
      settlement_timing: timing,
      is_active: true,
    });

    if (error) {
      console.error(error);
      setStatus("登録に失敗しました。名称重複の可能性があります。");
      return;
    }

    setName("");
    setType("other");
    setTiming("immediate");
    setStatus("登録しました。");
    await loadRows();
  };

  const handleToggleActive = async (row: PaymentMethod) => {
    if (!row.user_id) {
      setStatus("システム既定の支払方法は変更できません。");
      return;
    }

    const { error } = await supabase.from("payment_methods").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) {
      console.error(error);
      setStatus("更新に失敗しました。");
      return;
    }

    await loadRows();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">支払方法の管理</h1>
        <p className="text-gray-600 font-medium mt-2">独自の支払方法と引き落としタイミングを管理します。</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">新規追加</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input value={name} onChange={(event) => setName(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="例: 三井住友ゴールド" />
          <select value={type} onChange={(event) => setType(event.target.value as PaymentType)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium">
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={timing} onChange={(event) => setTiming(event.target.value as SettlementTiming)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium">
            <option value="immediate">残高引き落とし（即時）</option>
            <option value="next_month">翌月引き落とし（後払い）</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]">追加</button>
        </form>
        {status ? <p className="text-sm font-medium text-blue-700 mt-3">{status}</p> : null}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-3">名称</th><th className="py-3">種別</th><th className="py-3">引き落とし</th><th className="py-3">所有者</th><th className="py-3">状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="py-3 font-bold text-gray-900">{row.name}</td>
                <td className="py-3 text-gray-600">{row.type}</td>
                <td className="py-3 text-gray-600">{row.settlement_timing === "next_month" ? "翌月" : "即時"}</td>
                <td className="py-3 text-gray-600">{row.user_id ? "ユーザー" : "システム既定"}</td>
                <td className="py-3"><button type="button" onClick={() => void handleToggleActive(row)} className="bg-white text-gray-700 border border-gray-100 px-4 py-2 rounded-2xl hover:bg-gray-50 transition-all font-bold disabled:opacity-40" disabled={!row.user_id}>{row.is_active ? "有効" : "無効"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
