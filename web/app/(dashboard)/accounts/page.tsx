"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AssetType = "cash" | "qr" | "bank" | "emoney";

const assetTypeOptions: { value: AssetType; label: string }[] = [
  { value: "cash", label: "現金" },
  { value: "qr", label: "QR決済" },
  { value: "bank", label: "銀行" },
  { value: "emoney", label: "電子マネー" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("cash");
  const [openingBalanceYen, setOpeningBalanceYen] = useState("0");
  const [status, setStatus] = useState<string | null>(null);

  const loadAccounts = async () => {
    const { data, error } = await supabase.from("accounts").select("*").order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setStatus("口座一覧の取得に失敗しました。");
      return;
    }
    setAccounts(data || []);
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim()) {
      setStatus("管理場所名を入力してください。");
      return;
    }

    const amount = Number(openingBalanceYen);
    if (!Number.isFinite(amount)) {
      setStatus("初期残高は数値で入力してください。");
      return;
    }

    const { error } = await supabase.from("accounts").insert({
      name: name.trim(),
      asset_type: assetType,
      opening_balance_yen: Math.trunc(amount),
      is_active: true,
    });

    if (error) {
      console.error(error);
      setStatus("口座の登録に失敗しました。");
      return;
    }

    setName("");
    setOpeningBalanceYen("0");
    setAssetType("cash");
    setStatus("口座を登録しました。");
    await loadAccounts();
  };

  const handleToggleActive = async (account: Account) => {
    const { error } = await supabase.from("accounts").update({ is_active: !account.is_active }).eq("id", account.id);
    if (error) {
      console.error(error);
      setStatus("状態更新に失敗しました。");
      return;
    }
    await loadAccounts();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">管理場所（口座）</h1>
        <p className="text-gray-600 font-medium mt-2">財布・銀行・PayPay・Suica など残高管理の場所を登録します。</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">新規作成</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input value={name} onChange={(event) => setName(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="例: 財布" />
          <select value={assetType} onChange={(event) => setAssetType(event.target.value as AssetType)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium">
            {assetTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input type="number" value={openingBalanceYen} onChange={(event) => setOpeningBalanceYen(event.target.value)} className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="初期残高" />
          <button type="submit" className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]">追加</button>
        </form>
        {status ? <p className="text-sm font-medium text-blue-700 mt-3">{status}</p> : null}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500"><th className="py-3">名前</th><th className="py-3">種別</th><th className="py-3">初期残高</th><th className="py-3">状態</th></tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-gray-100">
                <td className="py-3 font-bold text-gray-900">{account.name}</td>
                <td className="py-3 text-gray-600">{account.asset_type}</td>
                <td className="py-3 text-gray-600">¥{account.opening_balance_yen.toLocaleString()}</td>
                <td className="py-3"><button type="button" onClick={() => void handleToggleActive(account)} className="bg-white text-gray-700 border border-gray-100 px-4 py-2 rounded-2xl hover:bg-gray-50 transition-all font-bold">{account.is_active ? "有効" : "無効"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
