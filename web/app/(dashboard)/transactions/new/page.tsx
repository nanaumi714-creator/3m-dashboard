"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SOURCE_TYPE = "manual";

type PaymentMethod = {
  id: string;
  name: string;
};

function normalizeVendor(raw: string): string {
  return raw
    .slice(0, 30)
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Category = {
  id: string;
  name: string;
};

export default function TransactionNewPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().split('T')[0]);
  const [amountYen, setAmountYen] = useState("");
  const [description, setDescription] = useState("");
  const [vendorRaw, setVendorRaw] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isBusiness, setIsBusiness] = useState<"business" | "personal" | "pending">("business");
  const [businessRatio, setBusinessRatio] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [{ data: methods }, { data: cats }] = await Promise.all([
          supabase.from("payment_methods").select("id, name").eq("is_active", true).order("name"),
          supabase.from("expense_categories").select("id, name").eq("is_active", true).order("name"),
        ]);
        setPaymentMethods((methods || []) as PaymentMethod[]);
        setCategories((cats || []) as Category[]);
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }

    loadOptions();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (!occurredOn) {
      setStatusMessage("取引日を入力してください。");
      return;
    }

    if (!amountYen || !Number.isFinite(Number(amountYen))) {
      setStatusMessage("金額を入力してください。");
      return;
    }

    if (!paymentMethodId) {
      setStatusMessage("支払い手段を選択してください。");
      return;
    }

    if (!description.trim()) {
      setStatusMessage("内容を入力してください。");
      return;
    }

    const rawAmount = Number(amountYen);
    const normalizedAmount = rawAmount < 0 ? rawAmount : -Math.abs(rawAmount);

    if (normalizedAmount === 0) {
      setStatusMessage("金額は0以外を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const vendorValue = vendorRaw.trim() || description.trim();
      const vendorNorm = normalizeVendor(vendorValue);
      const { data: sourceInsert, error: sourceError } = await supabase
        .from("import_sources")
        .insert({
          source_type: SOURCE_TYPE,
          metadata: {
            created_by: "gui_manual",
          },
        })
        .select("id")
        .single();

      if (sourceError) throw sourceError;
      if (!sourceInsert?.id) {
        throw new Error("入力ソースの登録に失敗しました。");
      }

      const fingerprint = await sha256(
        [occurredOn, normalizedAmount, paymentMethodId, vendorNorm, SOURCE_TYPE, Date.now()].join("|")
      );

      const { data: transaction, error } = await supabase.from("transactions").insert({
        occurred_on: occurredOn,
        amount_yen: normalizedAmount,
        description: description.trim(),
        payment_method_id: paymentMethodId,
        import_source_id: sourceInsert.id,
        vendor_raw: vendorValue,
        vendor_norm: vendorNorm,
        fingerprint,
      }).select("id").single();

      if (error || !transaction) throw error || new Error("Failed to create transaction.");

      // Create Business Info / Classification (only if NOT pending)
      if (isBusiness !== "pending") {
        const { error: infoError } = await supabase
          .from("transaction_business_info")
          .insert({
            transaction_id: transaction.id,
            is_business: isBusiness === "business",
            business_ratio: isBusiness === "business" ? Number(businessRatio) : 0,
            category_id: categoryId || null,
            judged_by: "manual_entry",
            judged_at: new Date().toISOString(),
            audit_note: "Manually registered with category."
          });

        if (infoError) throw infoError;
      }

      setStatusMessage("取引を登録しました。");
      setAmountYen("");
      setDescription("");
      setVendorRaw("");
      setPaymentMethodId("");
      setCategoryId("");
      // keep date and business flags for next entry if needed, or reset? 
      // Resetting is usually safer
    } catch (err) {
      console.error("Failed to create transaction", err);
      setStatusMessage(
        err instanceof Error ? err.message : "登録に失敗しました。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">手入力</h1>
            <p className="text-gray-600">取引を直接登録します（JPY・支出はマイナス）。</p>
          </div>
          <Link
            href="/transactions"
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取引一覧へ戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  取引日
                </label>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(event) => setOccurredOn(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金額（JPY, 支出はマイナス）
                </label>
                <input
                  type="number"
                  value={amountYen}
                  onChange={(event) => setAmountYen(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: Adobe Creative Cloud"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ベンダー（任意）
              </label>
              <input
                type="text"
                value={vendorRaw}
                onChange={(event) => setVendorRaw(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: Adobe"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支払い手段
                </label>
                <select
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">選択してください</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">未選択</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事業区分</label>
                <select
                  value={isBusiness}
                  onChange={(e) => setIsBusiness(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="business">事業経費</option>
                  <option value="personal">プライベート</option>
                  <option value="pending">未判定（後で選ぶ）</option>
                </select>
              </div>
              {isBusiness === "business" && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-blue-900 mb-1">事業按分 (%)</label>
                  <input
                    type="number"
                    min="0" max="100"
                    value={businessRatio}
                    onChange={(e) => setBusinessRatio(e.target.value)}
                    className="w-full border border-blue-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4">
              <p className="text-sm text-gray-600">
                入力内容は保存後に編集可能です。
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "保存中..." : "保存する"}
              </button>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-lg text-sm ${statusMessage.includes('失敗') || statusMessage.includes('入力してください') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {statusMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
