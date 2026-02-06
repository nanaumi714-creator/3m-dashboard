"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Transfer = Database["public"]["Tables"]["transfers"]["Row"];

type TransferWithAccount = Transfer & {
  from_account: Pick<Account, "name"> | null;
  to_account: Pick<Account, "name"> | null;
};

export default function TransfersPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<TransferWithAccount[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amountYen, setAmountYen] = useState("");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);

  const loadData = async () => {
    const [{ data: accountData, error: accountError }, { data: transferData, error: transferError }] = await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase.from("transfers").select("*, from_account:from_account_id(name), to_account:to_account_id(name)").order("occurred_on", { ascending: false }).limit(100),
    ]);

    if (accountError) {
      console.error(accountError);
      setStatus("口座一覧の取得に失敗しました。");
      return;
    }

    if (transferError) {
      console.error(transferError);
      setStatus("振替履歴の取得に失敗しました。");
      return;
    }

    setAccounts(accountData || []);
    setTransfers((transferData || []) as TransferWithAccount[]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const value = Number(amountYen);
    if (!fromAccountId || !toAccountId || !Number.isFinite(value) || value <= 0) {
      setStatus("From / To / 金額を正しく入力してください。");
      return;
    }
    if (fromAccountId === toAccountId) {
      setStatus("同一口座への振替はできません。");
      return;
    }

    const { error } = await supabase.from("transfers").insert({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount_yen: Math.trunc(value),
      occurred_on: occurredOn,
      note: note.trim() || null,
    });

    if (error) {
      console.error(error);
      setStatus("振替登録に失敗しました。");
      return;
    }

    setFromAccountId("");
    setToAccountId("");
    setAmountYen("");
    setNote("");
    setStatus("振替を登録しました。");
    await loadData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">資金移動（振替）</h1>
        <p className="text-gray-600 font-medium mt-2">管理場所間の資金移動を記録します。</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">振替登録</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium">
            <option value="">出金元</option>
            {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium">
            <option value="">入金先</option>
            {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <input type="number" value={amountYen} onChange={(event) => setAmountYen(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="金額" />
          <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
          <button type="submit" className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]">登録</button>
          <input value={note} onChange={(event) => setNote(event.target.value)} className="md:col-span-5 w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="メモ（任意）" />
        </form>
        {status ? <p className="text-sm font-medium text-blue-700 mt-3">{status}</p> : null}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">振替履歴</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500"><th className="py-3">日付</th><th className="py-3">From</th><th className="py-3">To</th><th className="py-3">金額</th><th className="py-3">メモ</th></tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id} className="border-t border-gray-100">
                <td className="py-3 text-gray-600">{transfer.occurred_on}</td>
                <td className="py-3 font-bold text-gray-900">{transfer.from_account?.name || "-"}</td>
                <td className="py-3 font-bold text-gray-900">{transfer.to_account?.name || "-"}</td>
                <td className="py-3 text-gray-600">¥{transfer.amount_yen.toLocaleString()}</td>
                <td className="py-3 text-gray-600">{transfer.note || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
