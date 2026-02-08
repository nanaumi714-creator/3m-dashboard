"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type PaymentMethodWithAccounts = PaymentMethodRow & {
  source_account: { name: string } | null;
  liability_account: { name: string } | null;
  settlement_account: { name: string } | null;
};

type SettlementTiming = "immediate" | "next_month";
type PaymentType = "cash" | "bank" | "qr" | "emoney" | "credit" | "other";

const typeOptions: { value: PaymentType; label: string }[] = [
  { value: "cash", label: "現金" },
  { value: "bank", label: "銀行口座" },
  { value: "qr", label: "QR決済" },
  { value: "emoney", label: "電子マネー" },
  { value: "credit", label: "クレジット" },
  { value: "other", label: "その他" },
];

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState<PaymentMethodWithAccounts[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentType>("other");
  const [timing, setTiming] = useState<SettlementTiming>("immediate");
  const [status, setStatus] = useState<string | null>(null);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [liabilityAccountId, setLiabilityAccountId] = useState("");
  const [settlementAccountId, setSettlementAccountId] = useState("");

  const loadRows = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*, source_account:accounts!payment_methods_source_account_id_fkey(name), liability_account:accounts!payment_methods_liability_account_id_fkey(name), settlement_account:accounts!payment_methods_settlement_account_id_fkey(name)")
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setStatus("支払方法の取得に失敗しました。");
      return;
    }
    setRows((data || []) as PaymentMethodWithAccounts[]);
  };

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) {
      console.error(error);
      setStatus("口座の取得に失敗しました。");
      return;
    }
    setAccounts((data || []) as AccountRow[]);
  };

  useEffect(() => {
    void loadRows();
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (type === "credit") {
      setTiming("next_month");
      setSourceAccountId("");
    } else {
      setTiming("immediate");
      setLiabilityAccountId("");
      setSettlementAccountId("");
    }
  }, [type]);

  const assetAccounts = useMemo(
    () => accounts.filter((a) => (a.account_type || "asset") === "asset"),
    [accounts]
  );

  const liabilityAccounts = useMemo(
    () => accounts.filter((a) => (a.account_type || "asset") === "liability"),
    [accounts]
  );

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim()) {
      setStatus("支払方法名を入力してください。");
      return;
    }

    if (type === "credit") {
      if (!liabilityAccountId || !settlementAccountId) {
        setStatus("クレジットは債務口座と決済口座の両方が必要です。");
        return;
      }
    } else if (!sourceAccountId) {
      setStatus("即時引き落としの支払方法は引落口座が必要です。");
      return;
    }

    const payload: Database["public"]["Tables"]["payment_methods"]["Insert"] = {
      name: name.trim(),
      type,
      settlement_timing: timing,
      is_active: true,
      source_account_id: type === "credit" ? null : sourceAccountId,
      liability_account_id: type === "credit" ? liabilityAccountId : null,
      settlement_account_id: type === "credit" ? settlementAccountId : null,
    };

    const { error } = await supabase.from("payment_methods").insert(payload);

    if (error) {
      console.error(error);
      setStatus("支払方法の登録に失敗しました。入力内容をご確認ください。");
      return;
    }

    setName("");
    setType("other");
    setTiming("immediate");
    setSourceAccountId("");
    setLiabilityAccountId("");
    setSettlementAccountId("");
    setStatus("支払方法を登録しました。");
    await loadRows();
  };

  const handleToggleActive = async (row: PaymentMethodWithAccounts) => {
    if (!row.user_id) {
      setStatus("システム既定の支払方法は変更できません。");
      return;
    }

    const { error } = await supabase
      .from("payment_methods")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
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
        <p className="text-gray-600 font-medium mt-2">支払方法と引落口座の紐付けを管理します。</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">支払方法の追加</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              placeholder="例: Visa, 現金, PayPay"
            />
            <select
              value={type}
              onChange={(event) => setType(event.target.value as PaymentType)}
              className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={timing}
              onChange={(event) => setTiming(event.target.value as SettlementTiming)}
              disabled={type === "credit"}
              className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium disabled:opacity-60"
            >
              <option value="immediate">残高引き落とし（即時）</option>
              <option value="next_month">残高引き落とし（翌月）</option>
            </select>
          </div>

          {type === "credit" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={liabilityAccountId}
                onChange={(event) => setLiabilityAccountId(event.target.value)}
                className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="">債務口座を選択</option>
                {liabilityAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select
                value={settlementAccountId}
                onChange={(event) => setSettlementAccountId(event.target.value)}
                className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="">決済口座を選択</option>
                {assetAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <select
              value={sourceAccountId}
              onChange={(event) => setSourceAccountId(event.target.value)}
              className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="">引落口座を選択</option>
              {assetAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]"
          >
            追加
          </button>
        </form>
        {status ? <p className="text-sm font-medium text-blue-700 mt-3">{status}</p> : null}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-3">名前</th>
              <th className="py-3">支払種別</th>
              <th className="py-3">引き落とし</th>
              <th className="py-3">口座紐付け</th>
              <th className="py-3">所有</th>
              <th className="py-3">有効/無効</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="py-3 font-bold text-gray-900">{row.name}</td>
                <td className="py-3 text-gray-600">{row.type}</td>
                <td className="py-3 text-gray-600">
                  {row.settlement_timing === "next_month" ? "翌月" : "即時"}
                </td>
                <td className="py-3 text-gray-600">
                  {row.type === "credit"
                    ? `${row.liability_account?.name || "-"} / ${row.settlement_account?.name || "-"}`
                    : row.source_account?.name || "-"}
                </td>
                <td className="py-3 text-gray-600">{row.user_id ? "ユーザー" : "システム"}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(row)}
                    className="bg-white text-gray-700 border border-gray-100 px-4 py-2 rounded-2xl hover:bg-gray-50 transition-all font-bold disabled:opacity-40"
                    disabled={!row.user_id}
                  >
                    {row.is_active ? "有効" : "無効"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
