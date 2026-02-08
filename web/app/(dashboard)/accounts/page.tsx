"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Account = {
  id: string;
  name: string;
  asset_type: string;
  account_type: string;
  opening_balance_yen: number;
  opened_on: string | null;
  is_active: boolean;
  created_at: string;
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("asset"); // asset | liability
  const [assetType, setAssetType] = useState("cash");
  const [openingBalanceYen, setOpeningBalanceYen] = useState("0");
  const [openedOn, setOpenedOn] = useState(new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const loadAccounts = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setStatus("口座一覧の取得に失敗しました。");
      return;
    }

    // Map data to ensure types
    const mappedAccounts = (data || []).map((a: any) => ({
      ...a,
      account_type: a.account_type || "asset",
    })) as Account[];

    setAccounts(mappedAccounts);
    setLoading(false);
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim()) {
      setStatus("口座名を入力してください。");
      return;
    }

    const amount = Number(openingBalanceYen);
    if (!Number.isFinite(amount)) {
      setStatus("初期残高は数値で入力してください。");
      return;
    }

    // Determine final asset type based on account type
    let finalAssetType = assetType;
    if (accountType === "liability") {
      finalAssetType = "credit_payable";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("accounts").insert({
      name: name.trim(),
      account_type: accountType,
      asset_type: finalAssetType,
      opening_balance_yen: Math.trunc(amount),
      opened_on: openedOn,
      is_active: true,
    });

    if (error) {
      console.error(error);
      setStatus("口座の登録に失敗しました。");
      return;
    }

    // Reset form
    setName("");
    setOpeningBalanceYen("0");
    setAccountType("asset");
    setAssetType("cash");
    setOpenedOn(new Date().toISOString().split("T")[0]);
    setStatus("口座を登録しました。");

    await loadAccounts();
  };

  const handleToggleActive = async (account: Account) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("accounts")
      .update({ is_active: !account.is_active })
      .eq("id", account.id);

    if (error) {
      console.error(error);
      setStatus("状態更新に失敗しました。");
      return;
    }
    await loadAccounts();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-pulse bg-white h-64 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 戻る
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">管理場所（口座）</h1>
          <p className="text-gray-600 font-medium mt-2">資産や負債（クレジットカードなど）の管理場所を登録します。</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">新規作成</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">種別</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accountType" value="asset" checked={accountType === "asset"} onChange={() => setAccountType("asset")} className="w-5 h-5 text-blue-600 focus:ring-blue-500" />
                  <span className="font-bold text-gray-700">資産（プラス）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accountType" value="liability" checked={accountType === "liability"} onChange={() => setAccountType("liability")} className="w-5 h-5 text-red-600 focus:ring-red-500" />
                  <span className="font-bold text-gray-700">負債（マイナス）</span>
                </label>
              </div>
            </div>

            {/* Opened On */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">開始日（残高計算の起点）</label>
              <input type="date" value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Name */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">名前</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium" placeholder="例: 財布、楽天カード" />
            </div>

            {/* Asset Type (Only if asset) */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">カテゴリー</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                disabled={accountType === "liability"}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium disabled:bg-gray-50 disabled:text-gray-400"
              >
                {accountType === "liability" ? (
                  <option value="credit_payable">クレジットカード等</option>
                ) : (
                  <>
                    <option value="cash">現金</option>
                    <option value="bank">銀行</option>
                    <option value="qr">QR決済</option>
                    <option value="emoney">電子マネー</option>
                  </>
                )}
              </select>
            </div>

            {/* Opening Balance */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">初期残高</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input type="number" value={openingBalanceYen} onChange={(e) => setOpeningBalanceYen(e.target.value)} className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium" placeholder="0" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]">
            口座を追加
          </button>
        </form>
        {status ? <p className="text-sm font-medium text-blue-700 mt-3">{status}</p> : null}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">登録済み一覧</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500"><th className="py-3">名前</th><th className="py-3">種別</th><th className="py-3">カテゴリー</th><th className="py-3">開始日</th><th className="py-3">初期残高</th><th className="py-3">状態</th></tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-gray-100">
                <td className="py-3 font-bold text-gray-900">{account.name}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${account.account_type === "liability" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                    {account.account_type === "liability" ? "負債" : "資産"}
                  </span>
                </td>
                <td className="py-3 text-gray-600">{account.asset_type}</td>
                <td className="py-3 text-gray-600">{account.opened_on || "未設定"}</td>
                <td className="py-3 text-gray-600">¥{account.opening_balance_yen.toLocaleString()}</td>
                <td className="py-3">
                  <button type="button" onClick={() => void handleToggleActive(account)} className={`border px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${account.is_active ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-gray-100 border-transparent text-gray-400"}`}>
                    {account.is_active ? "有効" : "無効"}
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
