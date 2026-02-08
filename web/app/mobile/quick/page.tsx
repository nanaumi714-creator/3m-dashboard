"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import CameraCapture from "../../(dashboard)/components/CameraCapture";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Account = any;

export default function MobileQuickEntryPage() {
  const [activeTab, setActiveTab] = useState<"expense" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);

  useEffect(() => {
    async function loadAccounts() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("accounts").select("*").order("name");
      if (error) {
        console.error(error);
        return;
      }
      setAccounts(data || []);
    }
    void loadAccounts();
  }, []);

  async function handleQuickEntry(e: React.FormEvent) {
    e.preventDefault();

    if (!amount || !description) {
      alert("金額と内容を入力してください");
      return;
    }

    try {
      setLoading(true);

      const { data: paymentMethod, error: paymentMethodError } = await supabase
        .from("payment_methods")
        .select("id")
        .eq("is_active", true)
        .order("name")
        .limit(1)
        .maybeSingle();

      if (paymentMethodError) throw paymentMethodError;
      if (!paymentMethod) throw new Error("支払い方法が見つかりません。先に支払い方法を登録してください。");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("transactions").insert({
        occurred_on: new Date().toISOString().split("T")[0],
        description,
        amount_yen: -Math.abs(parseInt(amount, 10)),
        payment_method_id: paymentMethod.id,
        vendor_raw: description,
        vendor_norm: description.toLowerCase().replace(/\s+/g, ""),
        fingerprint: "mobile-" + Date.now(),
      });

      if (error) throw error;

      alert("登録しました");
      setAmount("");
      setDescription("");
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransferEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !transferAmount) {
      alert("振替元・振替先・金額を入力してください");
      return;
    }
    if (fromAccountId === toAccountId) {
      alert("同じ管理場所には振替できません");
      return;
    }

    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("transfers").insert({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount_yen: Math.abs(Math.trunc(Number(transferAmount))),
        occurred_on: new Date().toISOString().split("T")[0],
        note: transferNote.trim() || null,
      });
      if (error) throw error;

      alert("振替を登録しました");
      setTransferAmount("");
      setTransferNote("");
      setFromAccountId("");
      setToAccountId("");
    } catch (err) {
      console.error(err);
      alert("振替の登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCameraCapture(file: File) {
    try {
      const fileName = `receipts/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from("receipts").upload(fileName, file);
      if (error) throw error;

      await supabase.from("receipts").insert({
        storage_url: data.path,
        original_filename: file.name,
        content_type: file.type || null,
        file_size_bytes: file.size,
      });

      alert("レシートをアップロードしました");
      setShowCamera(false);
    } catch (err) {
      console.error(err);
      alert("アップロードに失敗しました");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container-mobile py-6 space-y-6">
        <h1 className="text-2xl font-bold">簡易入力</h1>

        <div className="flex bg-white rounded-2xl border border-gray-100 p-1">
          <button onClick={() => setActiveTab("expense")} className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeTab === "expense" ? "bg-blue-600 text-white" : "text-gray-500"}`}>支出</button>
          <button onClick={() => setActiveTab("transfer")} className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeTab === "transfer" ? "bg-blue-600 text-white" : "text-gray-500"}`}>振替</button>
        </div>

        {activeTab === "expense" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">支出の簡易登録</h2>
            <form onSubmit={handleQuickEntry} className="space-y-4">
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-mobile" placeholder="金額" />
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-mobile" placeholder="内容（ランチ代など）" />
              <button type="submit" disabled={loading} className="btn-mobile w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "登録中..." : "登録"}</button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">管理場所間の振替</h2>
            <form onSubmit={handleTransferEntry} className="space-y-4">
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="input-mobile">
                <option value="">振替元を選択</option>
                {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="input-mobile">
                <option value="">振替先を選択</option>
                {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
              <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="input-mobile" placeholder="金額" />
              <input type="text" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} className="input-mobile" placeholder="メモ（任意）" />
              <button type="submit" disabled={loading} className="btn-mobile w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "登録中..." : "振替を登録"}</button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">レシート撮影</h2>
          {!showCamera ? <button onClick={() => setShowCamera(true)} className="btn-mobile w-full bg-green-600 text-white hover:bg-green-700">カメラを起動</button> : <CameraCapture onCapture={handleCameraCapture} />}
        </div>
      </div>
    </div>
  );
}
